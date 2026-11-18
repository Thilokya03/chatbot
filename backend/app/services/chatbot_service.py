import secrets
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models.models import Chatbot, ChatbotCreate, KnowledgeBase, KnowledgeBaseCreate
from app.services.cosmos_store import CosmosStore


class ChatbotService:
    def __init__(self) -> None:
        self.cosmos = CosmosStore()

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

    def add_document(self, kb_id: str, filename: str) -> Optional[Dict]:
        kb = self.get_knowledge_base(kb_id)
        if not kb:
            return None
        docs = kb.get("documents", [])
        if filename not in docs:
            docs.append(filename)
        self._ensure_cosmos()
        kb["documents"] = docs
        return self.cosmos.upsert_item(self.cosmos.kb_container_name, kb)
