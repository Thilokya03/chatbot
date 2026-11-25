import os

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.models.models import UserCreate, UserLogin, UserPasswordUpdate, UserProfileUpdate
from app.utils.auth import get_current_user
from app.services.auth_service import AuthService
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()
chatbot_service = ChatbotService()

SESSION_COOKIE_NAME = "session_id"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")


def _cookie_domain() -> str | None:
    # GitHub Codespaces forwarded domains need an explicit shared parent domain
    # so browser cookies are sent from frontend subdomain to backend subdomain.
    domain = os.getenv("COOKIE_DOMAIN", "").strip()
    return domain or None


def _sanitize_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at"),
    }


@router.post("/register")
def register(payload: UserCreate):
    try:
        user = auth_service.create_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True, "user": _sanitize_user(user)}


@router.post("/login")
def login(payload: UserLogin, response: Response):
    try:
        user = auth_service.authenticate(payload.email, payload.password)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        chatbot_service.ensure_default_chatbot(user["id"])
        session = auth_service.create_session(user["id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session["session_id"],
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=_cookie_domain(),
        path="/",
    )
    return {"ok": True, "user": _sanitize_user(user)}


@router.post("/logout")
def logout(response: Response, session_id: str = Cookie(default="", alias=SESSION_COOKIE_NAME)):
    if session_id:
        try:
            auth_service.delete_session(session_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    response.delete_cookie(key=SESSION_COOKIE_NAME, domain=_cookie_domain(), path="/")
    return {"ok": True}


@router.get("/me")
def me(session_id: str = Cookie(default="", alias=SESSION_COOKIE_NAME)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        session = auth_service.get_session(session_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    try:
        user = auth_service.get_user_by_id(session["user_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return _sanitize_user(user)


@router.put("/profile")
def update_profile(payload: UserProfileUpdate, user: dict = Depends(get_current_user)):
    try:
        updated_user = auth_service.update_user_name(user["id"], payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"ok": True, "user": _sanitize_user(updated_user)}


@router.put("/password")
def update_password(payload: UserPasswordUpdate, user: dict = Depends(get_current_user)):
    try:
        auth_service.update_user_password(user["id"], payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"ok": True}

