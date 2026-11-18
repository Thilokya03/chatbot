from fastapi import FastAPI

from app.routes.chat import router as chat_router
from app.routes.chatbot import router as chatbot_router
from app.routes.knowledge_base import router as knowledge_base_router

app = FastAPI(title="Multi-Tenant Chatbot Platform - Phase 1")

app.include_router(chatbot_router)
app.include_router(knowledge_base_router)
app.include_router(chat_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
    
