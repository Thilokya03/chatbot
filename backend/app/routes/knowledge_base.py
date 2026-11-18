from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.models import KnowledgeBaseCreate, KnowledgeBaseUpload
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])
service = ChatbotService()


@router.post("")
def create_knowledge_base(payload: KnowledgeBaseCreate):
    return service.create_knowledge_base(payload)


@router.post("/upload")
def upload_document(payload: KnowledgeBaseUpload):
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
