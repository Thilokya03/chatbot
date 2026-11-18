from fastapi import FastAPI

from app.routes.chat import router as chat_router
from app.routes.chatbot import router as chatbot_router
from app.routes.knowledge_base import router as knowledge_base_router
from app.services.cosmos_store import CosmosStore
from app.services.openai_service import AzureOpenAIService

app = FastAPI(title="Multi-Tenant Chatbot Platform - Phase 1" ,version="1.0.2")

app.include_router(chatbot_router)
app.include_router(knowledge_base_router)
app.include_router(chat_router)
    

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/dependencies")
def dependency_health():
    cosmos = CosmosStore()
    openai_service = AzureOpenAIService()

    cosmos_ok = cosmos.ensure_connected()
    cosmos_error = None if cosmos_ok else cosmos.last_error

    openai_ok = False
    openai_error = None
    try:
        if openai_service.client and openai_service.deployment:
            openai_service.generate_response("health check")
            openai_ok = True
        else:
            openai_error = "Azure OpenAI is not configured"
    except Exception as exc:
        openai_error = str(exc)

    return {
        "status": "ok" if cosmos_ok and openai_ok else "degraded",
        "cosmos": {
            "ok": cosmos_ok,
            "error": cosmos_error,
        },
        "openai": {
            "ok": openai_ok,
            "error": openai_error,
        },
    }
    