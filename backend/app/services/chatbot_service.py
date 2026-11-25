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

    def create_chatbot(self, payload: ChatbotCreate, owner_user_id: Optional[str] = None) -> Dict:
        chatbot = Chatbot(
            id=f"cb_{uuid.uuid4().hex[:8]}",
            name=payload.name,
            type=payload.type,
            api_key=secrets.token_hex(16),
            kb_id=payload.kb_id,
            created_at=datetime.utcnow().date().isoformat(),
        )
        payload = chatbot.model_dump()
        if owner_user_id:
            payload["owner_user_id"] = owner_user_id
        self._ensure_cosmos()
        return self.cosmos.upsert_item(self.cosmos.chatbot_container_name, payload)

    def ensure_default_chatbot(self, owner_user_id: str) -> Dict:
        self._ensure_cosmos()
        chatbots = self.cosmos.list_items(self.cosmos.chatbot_container_name)
        owned_chatbots = [
            chatbot
            for chatbot in chatbots
            if chatbot.get("owner_user_id") == owner_user_id
        ]
        default = next(
            (
                chatbot
                for chatbot in owned_chatbots
                if chatbot.get("is_default")
            ),
            None,
        )
        if default:
            return default
        if owned_chatbots:
            owned_chatbots[0]["is_default"] = True
            return self.cosmos.upsert_item(self.cosmos.chatbot_container_name, owned_chatbots[0])

        payload = ChatbotCreate(name="My assistant", type="normal")
        chatbot = self.create_chatbot(payload, owner_user_id)
        chatbot["is_default"] = True
        return self.cosmos.upsert_item(self.cosmos.chatbot_container_name, chatbot)

    def count_owned_chatbots(self, owner_user_id: str) -> int:
        self._ensure_cosmos()
        return sum(
            chatbot.get("owner_user_id") == owner_user_id
            for chatbot in self.cosmos.list_items(self.cosmos.chatbot_container_name)
        )

    def delete_chatbot(self, chatbot_id: str) -> None:
        self._ensure_cosmos()
        for conversation in self.cosmos.list_items(self.cosmos.conversation_container_name):
            if conversation.get("chatbot_id") == chatbot_id:
                self.cosmos.delete_item(self.cosmos.conversation_container_name, conversation["id"])
        self.cosmos.delete_item(self.cosmos.chatbot_container_name, chatbot_id)

    def list_chatbots(self) -> List[Dict]:
        self._ensure_cosmos()
        return self.cosmos.list_items(self.cosmos.chatbot_container_name)

    def get_chatbot(self, chatbot_id: str) -> Optional[Dict]:
        self._ensure_cosmos()
        return self.cosmos.get_item(self.cosmos.chatbot_container_name, "id", chatbot_id)

    def create_knowledge_base(
        self,
        payload: KnowledgeBaseCreate,
        owner_user_id: Optional[str] = None,
    ) -> Dict:
        kb = KnowledgeBase(id=f"kb_{uuid.uuid4().hex[:8]}", name=payload.name, documents=[])
        payload = kb.model_dump()
        if owner_user_id:
            payload["owner_user_id"] = owner_user_id
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

    def get_chatbot_usage(self, chatbot_id: str) -> tuple[int, int, Optional[str]]:
        self._ensure_cosmos()
        conversations = [
            item
            for item in self.cosmos.list_items(self.cosmos.conversation_container_name)
            if item.get("chatbot_id") == chatbot_id
        ]

        conversation_count = len(conversations)
        message_count = sum(len(item.get("messages", [])) for item in conversations)
        last_activity_at = max((item.get("updated_at") or "" for item in conversations), default="")
        return conversation_count, message_count, (last_activity_at or None)
