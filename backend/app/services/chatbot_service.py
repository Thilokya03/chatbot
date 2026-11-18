import secrets
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.models.models import Chatbot, ChatbotCreate, KnowledgeBase, KnowledgeBaseCreate
from app.services.json_store import JsonStore


class ChatbotService:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        self.chatbots_file = base_dir / "storage" / "chatbots" / "chatbots.json"
        self.kbs_file = base_dir / "storage" / "knowledge_bases" / "knowledge_bases.json"

    def create_chatbot(self, payload: ChatbotCreate) -> Dict:
        chatbot = Chatbot(
            id=f"cb_{uuid.uuid4().hex[:8]}",
            name=payload.name,
            type=payload.type,
            api_key=secrets.token_hex(16),
            kb_id=payload.kb_id,
            created_at=datetime.utcnow().date().isoformat(),
        )
        return JsonStore.create_record(self.chatbots_file, chatbot.model_dump(), "id")

    def list_chatbots(self) -> List[Dict]:
        return JsonStore.load_json(self.chatbots_file)

    def get_chatbot(self, chatbot_id: str) -> Optional[Dict]:
        return JsonStore.get_record(self.chatbots_file, "id", chatbot_id)

    def create_knowledge_base(self, payload: KnowledgeBaseCreate) -> Dict:
        kb = KnowledgeBase(id=f"kb_{uuid.uuid4().hex[:8]}", name=payload.name, documents=[])
        return JsonStore.create_record(self.kbs_file, kb.model_dump(), "id")

    def get_knowledge_base(self, kb_id: str) -> Optional[Dict]:
        return JsonStore.get_record(self.kbs_file, "id", kb_id)

    def add_document(self, kb_id: str, filename: str) -> Optional[Dict]:
        kb = self.get_knowledge_base(kb_id)
        if not kb:
            return None
        docs = kb.get("documents", [])
        if filename not in docs:
            docs.append(filename)
        return JsonStore.update_record(self.kbs_file, "id", kb_id, {"documents": docs})
