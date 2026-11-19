import secrets
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models.models import Chatbot, ChatbotCreate, KnowledgeBase, KnowledgeBaseCreate
from app.services.cosmos_store import CosmosStore
from app.services.openai_service import AzureOpenAIService


class ChatbotService:
    def __init__(self) -> None:
        self.cosmos = CosmosStore()
        self.openai = AzureOpenAIService()

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        cleaned = (text or "").strip()
        if not cleaned:
            return []

        chunks: List[str] = []
        start = 0
        text_len = len(cleaned)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk = cleaned[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end == text_len:
                break
            start = max(end - overlap, start + 1)
        return chunks

    @staticmethod
    def _truncate_embedding(vector: List[float], max_dims: int = 256) -> List[float]:
        if not vector:
            return []
        return vector[:max_dims]

    @staticmethod
    def _estimate_doc_size(item: Dict) -> int:
        return len(str(item).encode("utf-8"))

    def _ensure_cosmos(self) -> None:
        if not self.cosmos.ensure_connected():
            raise RuntimeError(self.cosmos.last_error or "Cosmos DB is unavailable")

    def create_chatbot(self, payload: ChatbotCreate) -> Dict:
        chatbot = Chatbot(
            id=f"cb_{uuid.uuid4().hex[:8]}",
            name=payload.name,
            type=payload.type,
            api_key=secrets.token_hex(16),
            kb_id=payload.kb_id,
            created_at=datetime.utcnow().date().isoformat(),
        )
        payload = chatbot.model_dump()
        self._ensure_cosmos()
        return self.cosmos.upsert_item(self.cosmos.chatbot_container_name, payload)

    def list_chatbots(self) -> List[Dict]:
        self._ensure_cosmos()
        return self.cosmos.list_items(self.cosmos.chatbot_container_name)

    def get_chatbot(self, chatbot_id: str) -> Optional[Dict]:
        self._ensure_cosmos()
        return self.cosmos.get_item(self.cosmos.chatbot_container_name, "id", chatbot_id)

    def create_knowledge_base(self, payload: KnowledgeBaseCreate) -> Dict:
        kb = KnowledgeBase(id=f"kb_{uuid.uuid4().hex[:8]}", name=payload.name, documents=[])
        payload = kb.model_dump()
        self._ensure_cosmos()
        return self.cosmos.upsert_item(self.cosmos.kb_container_name, payload)

    def get_knowledge_base(self, kb_id: str) -> Optional[Dict]:
        self._ensure_cosmos()
        return self.cosmos.get_item(self.cosmos.kb_container_name, "id", kb_id)

    def add_document(self, kb_id: str, filename: str, text: str) -> Optional[Dict]:
        kb = self.get_knowledge_base(kb_id)
        if not kb:
            return None

        chunks = self._chunk_text(text, chunk_size=400, overlap=80)
        if not chunks:
            chunks = [filename]

        embedded_chunks = []
        max_chunks = 50
        for index, chunk in enumerate(chunks):
            if index >= max_chunks:
                break
            embedded_chunks.append(
                {
                    "chunk_id": f"{filename}:{index}",
                    "filename": filename,
                    "text": chunk[:800],
                    "embedding": self._truncate_embedding(self.openai.embed_text(chunk), max_dims=256),
                }
            )

        existing_docs = kb.get("documents", [])
        filtered_docs = [doc for doc in existing_docs if doc.get("filename") != filename]
        docs = filtered_docs + embedded_chunks

        self._ensure_cosmos()
        kb["documents"] = docs

        max_document_size_bytes = 1800000
        while docs and self._estimate_doc_size(kb) > max_document_size_bytes:
            docs.pop(0)
            kb["documents"] = docs

        return self.cosmos.upsert_item(self.cosmos.kb_container_name, kb)
