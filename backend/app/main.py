import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router
from app.routes.chatbot import router as chatbot_router
from app.routes.knowledge_base import router as knowledge_base_router
from app.routes.auth import router as auth_router
from app.services.cosmos_store import CosmosStore
from app.services.openai_service import AzureOpenAIService
from app.routes.auth import auth_service

logger = logging.getLogger(__name__)

cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,"
        "https://verbose-space-garbanzo-jxjrvg76vp6cq7j-5173.app.github.dev,"
        "https://verbose-space-garbanzo-jxjrvg76vp6cq7j-5174.app.github.dev",
    ).split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        auth_service.initialize_admin()
    except RuntimeError as exc:
        logger.warning("Admin initialization skipped: %s", exc)
    yield


app = FastAPI(
    title="Multi-Tenant Chatbot Platform - Phase 1",
    version="1.0.2",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router)
app.include_router(knowledge_base_router)
app.include_router(chat_router)
app.include_router(auth_router)
    

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
    