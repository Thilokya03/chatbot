from fastapi import APIRouter, HTTPException

from app.models.models import ChatbotCreate
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbots", tags=["chatbots"])
service = ChatbotService()


@router.post("")
def create_chatbot(payload: ChatbotCreate):
    if payload.type == "knowledge_base" and not payload.kb_id:
        raise HTTPException(status_code=400, detail="kb_id is required for knowledge_base chatbot")

    if payload.kb_id and not service.get_knowledge_base(payload.kb_id):
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return service.create_chatbot(payload)


@router.get("")
def list_chatbots():
    return service.list_chatbots()


@router.get("/{chatbot_id}")
def get_chatbot(chatbot_id: str):
    chatbot = service.get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    return chatbot
