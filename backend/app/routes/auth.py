import os

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.models.models import UserCreate, UserLogin
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()

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
    return {"ok": True, "user": _sanitize_user(user)}


@router.post("/login")
def login(payload: UserLogin, response: Response):
    user = auth_service.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session = auth_service.create_session(user["id"])
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
        auth_service.delete_session(session_id)
    response.delete_cookie(key=SESSION_COOKIE_NAME, domain=_cookie_domain(), path="/")
    return {"ok": True}


@router.get("/me")
def me(session_id: str = Cookie(default="", alias=SESSION_COOKIE_NAME)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = auth_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = auth_service.get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return _sanitize_user(user)

