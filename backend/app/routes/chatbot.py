from fastapi import APIRouter, Depends, HTTPException

from app.models.models import Chatbot, ChatbotCreate, ChatbotPublic
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_current_user, verify_chatbot_user_access

router = APIRouter(prefix="/chatbots", tags=["chatbots"])
service = ChatbotService()


@router.post("", response_model=Chatbot)
def create_chatbot(payload: ChatbotCreate, user: dict = Depends(get_current_user)):
    if payload.type == "knowledge_base" and not payload.kb_id:
        raise HTTPException(status_code=400, detail="kb_id is required for knowledge_base chatbot")

    if payload.kb_id and not service.get_knowledge_base(payload.kb_id):
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return service.create_chatbot(payload, user["id"])


@router.get("", response_model=list[ChatbotPublic])
def list_chatbots(user: dict = Depends(get_current_user)):
    chatbots = service.list_chatbots()
    if user.get("role") != "admin":
        chatbots = [
            chatbot
            for chatbot in chatbots
            if not chatbot.get("owner_user_id") or chatbot.get("owner_user_id") == user.get("id")
        ]
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
def get_chatbot(chatbot_id: str, user: dict = Depends(get_current_user)):
    chatbot = verify_chatbot_user_access(chatbot_id, user)
    return {
        "id": chatbot.get("id"),
        "name": chatbot.get("name"),
        "type": chatbot.get("type"),
        "kb_id": chatbot.get("kb_id"),
        "created_at": chatbot.get("created_at"),
    }
