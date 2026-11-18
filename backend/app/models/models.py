from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ChatbotCreate(BaseModel):
    name: str
    type: Literal["normal", "knowledge_base"] = "normal"
    kb_id: Optional[str] = None


class Chatbot(BaseModel):
    id: str
    name: str
    type: Literal["normal", "knowledge_base"]
    api_key: str
    kb_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().date().isoformat())


class ChatbotPublic(BaseModel):
    id: str
    name: str
    type: Literal["normal", "knowledge_base"]
    kb_id: Optional[str] = None
    created_at: str


class KnowledgeBaseCreate(BaseModel):
    name: str


class KnowledgeBase(BaseModel):
    id: str
    name: str
    documents: List[str] = Field(default_factory=list)


class KnowledgeBaseUpload(BaseModel):
    chatbot_id: str
    kb_id: str
    filename: str


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class Conversation(BaseModel):
    chatbot_id: str
    messages: List[Message] = Field(default_factory=list)


class ChatRequest(BaseModel):
    chatbot_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str