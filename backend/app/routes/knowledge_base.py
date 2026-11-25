from io import BytesIO

from fastapi import APIRouter, Cookie, Depends, File, Form, Header, HTTPException, UploadFile
from pypdf import PdfReader

try:
    from docx import Document  # type: ignore
except ImportError:  # pragma: no cover
    Document = None

from app.models.models import KnowledgeBaseCreate
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_current_user, verify_chatbot_api_key, verify_chatbot_user_access

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])
service = ChatbotService()


def _extract_text_from_file(filename: str, content: bytes) -> str:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension == "txt":
        return content.decode("utf-8", errors="ignore")

    if extension == "pdf":
        reader = PdfReader(BytesIO(content))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages_text).strip()

    if extension == "docx":
        if not Document:
            raise HTTPException(status_code=500, detail="python-docx is required for .docx files")
        doc = Document(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in doc.paragraphs).strip()

    raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .pdf, .docx, .doc, .txt")


@router.post("")
def create_knowledge_base(payload: KnowledgeBaseCreate, user: dict = Depends(get_current_user)):
    return service.create_knowledge_base(payload, user["id"])


@router.post("/upload")
async def upload_document(
    chatbot_id: str = Form(...),
    file: UploadFile = File(...),
    x_api_key: str = Header(default="", alias="x-api-key"),
    session_id: str = Cookie(default="", alias="session_id"),
):
    if x_api_key:
        verify_chatbot_api_key(chatbot_id, x_api_key)
        chatbot = service.get_chatbot(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
    else:
        user = get_current_user(session_id)
        chatbot = verify_chatbot_user_access(chatbot_id, user)

    if chatbot.get("type") != "knowledge_base" or not chatbot.get("kb_id"):
        raise HTTPException(status_code=400, detail="This chatbot does not have a knowledge base")
    if not service.get_knowledge_base(chatbot["kb_id"]):
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    content = await file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size must not exceed 10 MB")

    filename = (file.filename or "document").replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not filename:
        raise HTTPException(status_code=400, detail="A filename is required")
    text = _extract_text_from_file(filename, content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded document")

    service.add_document(chatbot["kb_id"], filename, text)
    return {"message": "Document uploaded", "filename": filename, "chatbot_id": chatbot_id}
