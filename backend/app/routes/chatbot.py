from fastapi import APIRouter, HTTPException

from app.models.models import Chatbot, ChatbotCreate, ChatbotPublic
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbots", tags=["chatbots"])
service = ChatbotService()


@router.post("", response_model=Chatbot)
def create_chatbot(payload: ChatbotCreate):
    if payload.type == "knowledge_base" and not payload.kb_id:
        raise HTTPException(status_code=400, detail="kb_id is required for knowledge_base chatbot")

    if payload.kb_id and not service.get_knowledge_base(payload.kb_id):
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return service.create_chatbot(payload)


@router.get("", response_model=list[ChatbotPublic])
def list_chatbots():
    chatbots = service.list_chatbots()
    return [
        {
            "id": chatbot.get("id"),
            "name": chatbot.get("name"),
            "type": chatbot.get("type"),
            "kb_id": chatbot.get("kb_id"),
            "created_at": chatbot.get("created_at"),
        }
        for chatbot in chatbots
    ]


@router.get("/{chatbot_id}", response_model=ChatbotPublic)
def get_chatbot(chatbot_id: str):
    chatbot = service.get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    return {
        "id": chatbot.get("id"),
        "name": chatbot.get("name"),
        "type": chatbot.get("type"),
        "kb_id": chatbot.get("kb_id"),
        "created_at": chatbot.get("created_at"),
    }
