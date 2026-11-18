from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.models import ChatRequest, ChatResponse
from app.services.chatbot_service import ChatbotService
from app.services.json_store import JsonStore
from app.services.openai_service import AzureOpenAIService

router = APIRouter(tags=["chat"])
chatbot_service = ChatbotService()
llm_service = AzureOpenAIService()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    chatbot = chatbot_service.get_chatbot(payload.chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    base_dir = Path(__file__).resolve().parents[2]
    conversations_file = base_dir / "storage" / "conversations" / "conversations.json"

    conversation = JsonStore.get_record(conversations_file, "chatbot_id", payload.chatbot_id)
    if not conversation:
        conversation = {"chatbot_id": payload.chatbot_id, "messages": []}
        JsonStore.create_record(conversations_file, conversation, "chatbot_id")

    messages = conversation.get("messages", [])
    messages.append({"role": "user", "content": payload.message})

    system_prompt = "You are a helpful assistant."
    if chatbot.get("type") == "knowledge_base":
        kb_id = chatbot.get("kb_id")
        kb = chatbot_service.get_knowledge_base(kb_id) if kb_id else None
        docs = ", ".join(kb.get("documents", [])) if kb else ""
        system_prompt = (
            "You are a knowledge-base assistant. Use available documents when relevant. "
            f"Available docs: {docs or 'none'}."
        )

    llm_messages = [{"role": "system", "content": system_prompt}] + messages
    reply = llm_service.chat(llm_messages)

    messages.append({"role": "assistant", "content": reply})
    JsonStore.update_record(conversations_file, "chatbot_id", payload.chatbot_id, {"messages": messages})

    return ChatResponse(reply=reply)
