from fastapi import APIRouter, Depends, HTTPException

from app.models.models import ChatRequest, ChatResponse
from app.services.chatbot_service import ChatbotService
from app.services.cosmos_store import CosmosStore
from app.services.openai_service import AzureOpenAIService
from app.utils.auth import get_required_api_key, verify_chatbot_api_key

router = APIRouter(tags=["chat"])
chatbot_service = ChatbotService()
llm_service = AzureOpenAIService()
cosmos_store = CosmosStore()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, x_api_key: str = Depends(get_required_api_key)):
    verify_chatbot_api_key(payload.chatbot_id, x_api_key)

    if not cosmos_store.ensure_connected():
        raise HTTPException(status_code=503, detail=cosmos_store.last_error or "Cosmos DB is unavailable")

    chatbot = chatbot_service.get_chatbot(payload.chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    conversation = cosmos_store.get_item(cosmos_store.conversation_container_name, "chatbot_id", payload.chatbot_id)
    if not conversation:
        conversation = {"id": payload.chatbot_id, "chatbot_id": payload.chatbot_id, "messages": []}
        cosmos_store.upsert_item(cosmos_store.conversation_container_name, conversation)

    messages = conversation.get("messages", [])
    messages.append({"role": "user", "content": payload.message})

    system_prompt = "You are a helpful assistant."
    if chatbot.get("type") == "knowledge_base":
        kb_id = chatbot.get("kb_id")
        kb = chatbot_service.get_knowledge_base(kb_id) if kb_id else None
        docs = ""
        if kb:
            doc_items = kb.get("documents", [])
            names = []
            seen = set()
            for item in doc_items:
                if isinstance(item, dict):
                    name = item.get("filename")
                elif isinstance(item, str):
                    name = item
                else:
                    name = None

                if name and name not in seen:
                    seen.add(name)
                    names.append(name)

            docs = ", ".join(names)
        system_prompt = (
            "You are a knowledge-base assistant. Use available documents when relevant. "
            f"Available docs: {docs or 'none'}."
        )

    llm_messages = [{"role": "system", "content": system_prompt}] + messages
    reply = llm_service.chat(llm_messages)

    messages.append({"role": "assistant", "content": reply})
    conversation["messages"] = messages
    if "id" not in conversation:
        conversation["id"] = payload.chatbot_id
    cosmos_store.upsert_item(cosmos_store.conversation_container_name, conversation)

    return ChatResponse(reply=reply)


@router.get("/conversations/{chatbot_id}")
def get_conversation(chatbot_id: str, x_api_key: str = Depends(get_required_api_key)):
    verify_chatbot_api_key(chatbot_id, x_api_key)

    if not cosmos_store.ensure_connected():
        raise HTTPException(status_code=503, detail=cosmos_store.last_error or "Cosmos DB is unavailable")

    conversation = cosmos_store.get_item(cosmos_store.conversation_container_name, "chatbot_id", chatbot_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/conversations/{chatbot_id}")
def clear_conversation(chatbot_id: str, x_api_key: str = Depends(get_required_api_key)):
    verify_chatbot_api_key(chatbot_id, x_api_key)

    if not cosmos_store.ensure_connected():
        raise HTTPException(status_code=503, detail=cosmos_store.last_error or "Cosmos DB is unavailable")

    conversation = cosmos_store.get_item(cosmos_store.conversation_container_name, "chatbot_id", chatbot_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    doc_id = conversation.get("id")
    if not doc_id:
        raise HTTPException(status_code=500, detail="Conversation id missing")

    cosmos_store.delete_item(cosmos_store.conversation_container_name, doc_id)
    return {"message": "Conversation deleted", "chatbot_id": chatbot_id}
