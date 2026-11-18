from fastapi import Header, HTTPException

from app.services.chatbot_service import ChatbotService


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
