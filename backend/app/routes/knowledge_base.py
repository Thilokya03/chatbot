from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pypdf import PdfReader

try:
    from docx import Document  # type: ignore
except Exception:  # pragma: no cover
    Document = None

from app.models.models import KnowledgeBaseCreate, KnowledgeBaseUpload
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_required_api_key, verify_chatbot_api_key

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])
service = ChatbotService()


def _extract_text_from_file(file_path: Path) -> str:
    extension = file_path.suffix.lower()

    if extension == ".txt":
        return file_path.read_text(encoding="utf-8", errors="ignore")

    if extension == ".pdf":
        reader = PdfReader(str(file_path))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages_text).strip()

    if extension == ".docx":
        if not Document:
            raise HTTPException(status_code=500, detail="python-docx is required for .docx files")
        doc = Document(str(file_path))
        return "\n".join(paragraph.text for paragraph in doc.paragraphs).strip()

    if extension == ".doc":
        raise HTTPException(
            status_code=400,
            detail=".doc format is not supported directly. Please upload as .docx, .pdf, or .txt",
        )

    raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .pdf, .docx, .doc, .txt")


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

    text = _extract_text_from_file(file_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded document")

    updated = service.add_document(payload.kb_id, payload.filename, text)
    return {"message": "Document linked", "knowledge_base": updated}
