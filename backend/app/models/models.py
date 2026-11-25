from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ChatbotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: Literal["normal", "knowledge_base"] = "normal"
    kb_id: Optional[str] = None


class ChatbotRename(BaseModel):
    name: str = Field(min_length=1, max_length=100)


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
    is_default: bool = False
    owned_by_user: bool = False
    can_manage: bool = False


class ChatbotUsage(BaseModel):
    chatbot_id: str
    chatbot_name: str
    conversation_count: int
    message_count: int
    last_activity_at: Optional[str] = None


class KnowledgeBaseCreate(BaseModel):
    name: str


class KnowledgeBase(BaseModel):
    id: str
    name: str
    documents: List[dict] = Field(default_factory=list)


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
    conversation_id: Optional[str] = None


class ConversationCreate(BaseModel):
    title: str = "New chat"


class ChatResponse(BaseModel):
    reply: str


class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserProfileUpdate(BaseModel):
    name: str


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str