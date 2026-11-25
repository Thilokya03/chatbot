from fastapi import Cookie, Header, HTTPException

from app.services.auth_service import AuthService
from app.services.chatbot_service import ChatbotService

auth_service = AuthService()


def get_current_user(session_id: str = Cookie(default="", alias="session_id")) -> dict:
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session = auth_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        user = auth_service.get_user_by_id(session["user_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def verify_chatbot_api_key(chatbot_id: str, x_api_key: str) -> None:
    service = ChatbotService()
    chatbot = service.get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    expected_key = chatbot.get("api_key")
    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


def get_required_api_key(x_api_key: str = Header(default="", alias="x-api-key")) -> str:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="x-api-key header is required")
    return x_api_key


def verify_chatbot_user_access(chatbot_id: str, user: dict) -> dict:
    service = ChatbotService()
    try:
        chatbot = service.get_chatbot(chatbot_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")

    owner_id = chatbot.get("owner_user_id")
    if owner_id and owner_id != user.get("id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You do not have access to this chatbot")
    return chatbot
