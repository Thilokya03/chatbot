from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.models.models import KnowledgeBaseCreate, KnowledgeBaseUpload
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_required_api_key, verify_chatbot_api_key

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])
service = ChatbotService()


@router.post("")
def create_knowledge_base(payload: KnowledgeBaseCreate):
    return service.create_knowledge_base(payload)


@router.post("/upload")
def upload_document(payload: KnowledgeBaseUpload, x_api_key: str = Depends(get_required_api_key)):
    verify_chatbot_api_key(payload.chatbot_id, x_api_key)

    chatbot = service.get_chatbot(payload.chatbot_id)
    if chatbot.get("kb_id") != payload.kb_id:
        raise HTTPException(status_code=403, detail="Chatbot is not linked to this knowledge base")

    kb = service.get_knowledge_base(payload.kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    upload_dir = Path(__file__).resolve().parents[2] / "storage" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / payload.filename
    if not file_path.exists():
        file_path.write_text("placeholder", encoding="utf-8")

    updated = service.add_document(payload.kb_id, payload.filename)
    return {"message": "Document linked", "knowledge_base": updated}
