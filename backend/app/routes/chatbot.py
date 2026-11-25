from fastapi import APIRouter, Depends, HTTPException

from app.models.models import Chatbot, ChatbotCreate, ChatbotPublic, ChatbotRename, ChatbotUsage, KnowledgeBaseCreate
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_current_user, verify_chatbot_user_access

router = APIRouter(prefix="/chatbots", tags=["chatbots"])
service = ChatbotService()


@router.post("", response_model=Chatbot)
def create_chatbot(payload: ChatbotCreate, user: dict = Depends(get_current_user)):
    if service.count_owned_chatbots(user["id"]) >= 10:
        raise HTTPException(status_code=409, detail="You can create a maximum of 10 chatbots")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Chatbot name is required")
    payload = payload.model_copy(update={"name": name})

    if payload.type == "knowledge_base" and not payload.kb_id:
        kb = service.create_knowledge_base(
            KnowledgeBaseCreate(name=f"{payload.name} knowledge base"),
            user["id"],
        )
        payload = payload.model_copy(update={"kb_id": kb["id"]})

    if payload.kb_id:
        kb = service.get_knowledge_base(payload.kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        if kb.get("owner_user_id") not in (None, user["id"]) and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="You do not have access to this knowledge base")

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
            "is_default": chatbot.get("is_default", False),
            "owned_by_user": chatbot.get("owner_user_id") == user.get("id"),
            "can_manage": chatbot.get("owner_user_id") == user.get("id") or user.get("role") == "admin",
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
        "is_default": chatbot.get("is_default", False),
        "owned_by_user": chatbot.get("owner_user_id") == user.get("id"),
        "can_manage": chatbot.get("owner_user_id") == user.get("id") or user.get("role") == "admin",
    }


@router.get("/{chatbot_id}/api-access")
def get_chatbot_api_access(chatbot_id: str, user: dict = Depends(get_current_user)):
    chatbot = verify_chatbot_user_access(chatbot_id, user)
    return {
        "chatbot_id": chatbot.get("id"),
        "chatbot_name": chatbot.get("name"),
        "api_key": chatbot.get("api_key"),
    }


@router.patch("/{chatbot_id}")
def rename_chatbot(chatbot_id: str, payload: ChatbotRename, user: dict = Depends(get_current_user)):
    chatbot = verify_chatbot_user_access(chatbot_id, user)
    if not chatbot.get("owner_user_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the chatbot owner can rename this chatbot")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Chatbot name is required")
    chatbot["name"] = name
    return service.cosmos.upsert_item(service.cosmos.chatbot_container_name, chatbot)


@router.delete("/{chatbot_id}")
def delete_chatbot(chatbot_id: str, user: dict = Depends(get_current_user)):
    chatbot = verify_chatbot_user_access(chatbot_id, user)
    if not chatbot.get("owner_user_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the chatbot owner can delete this chatbot")
    service.delete_chatbot(chatbot_id)
    return {"message": "Chatbot deleted", "chatbot_id": chatbot_id}


@router.get("/usage/summary", response_model=list[ChatbotUsage])
def get_chatbot_usage_summary(user: dict = Depends(get_current_user)):
    chatbots = service.list_chatbots()
    if user.get("role") != "admin":
        chatbots = [
            chatbot
            for chatbot in chatbots
            if not chatbot.get("owner_user_id") or chatbot.get("owner_user_id") == user.get("id")
        ]

    usage = []
    for chatbot in chatbots:
        conversation_count, message_count, last_activity_at = service.get_chatbot_usage(chatbot.get("id"))
        usage.append(
            {
                "chatbot_id": chatbot.get("id"),
                "chatbot_name": chatbot.get("name"),
                "conversation_count": conversation_count,
                "message_count": message_count,
                "last_activity_at": last_activity_at,
            }
        )

    return usage
