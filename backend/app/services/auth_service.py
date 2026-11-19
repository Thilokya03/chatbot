import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

from app.models.models import UserCreate
from app.services.cosmos_store import CosmosStore


class AuthService:
    def __init__(self) -> None:
        self.cosmos = CosmosStore()
        self.session_ttl_days = int(os.getenv("SESSION_TTL_DAYS", "7"))

    def _ensure_cosmos(self) -> None:
        if not self.cosmos.ensure_connected():
            raise RuntimeError(self.cosmos.last_error or "Cosmos DB is unavailable")

    def initialize_admin(self) -> bool:
        email = self._normalize_email(os.getenv("ADMIN_EMAIL", ""))
        password = os.getenv("ADMIN_PASSWORD", "")
        if not email or not password:
            return False

        self._ensure_cosmos()
        existing = self.cosmos.get_item(self.cosmos.user_container_name, "email", email)
        if existing:
            if existing.get("role") == "admin":
                return False
            existing["role"] = "admin"
            self.cosmos.upsert_item(self.cosmos.user_container_name, existing)
            return True

        salt = secrets.token_hex(16)
        user = {
            "id": f"usr_{uuid.uuid4().hex[:10]}",
            "email": email,
            "name": os.getenv("ADMIN_NAME", "Administrator"),
            "role": "admin",
            "password_salt": salt,
            "password_hash": self._hash_password(password, salt),
            "created_at": datetime.utcnow().isoformat(),
        }
        self.cosmos.upsert_item(self.cosmos.user_container_name, user)
        return True

    @staticmethod
    def _normalize_email(email: str) -> str:
        return (email or "").strip().lower()

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        payload = f"{salt}:{password}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def create_user(self, payload: UserCreate) -> Dict:
        self._ensure_cosmos()
        email = self._normalize_email(payload.email)
        if not email or not payload.password:
            raise ValueError("Email and password are required")

        existing = self.cosmos.get_item(self.cosmos.user_container_name, "email", email)
        if existing:
            raise ValueError("User already exists")

        salt = secrets.token_hex(16)
        user = {
            "id": f"usr_{uuid.uuid4().hex[:10]}",
            "email": email,
            "name": payload.name,
            "role": "user",
            "password_salt": salt,
            "password_hash": self._hash_password(payload.password, salt),
            "created_at": datetime.utcnow().isoformat(),
        }
        return self.cosmos.upsert_item(self.cosmos.user_container_name, user)

    def authenticate(self, email: str, password: str) -> Optional[Dict]:
        self._ensure_cosmos()
        user = self.cosmos.get_item(self.cosmos.user_container_name, "email", self._normalize_email(email))
        if not user:
            return None

        expected = user.get("password_hash", "")
        salt = user.get("password_salt", "")
        if not expected or not salt:
            return None

        if self._hash_password(password, salt) != expected:
            return None
        return user

    def create_session(self, user_id: str) -> Dict:
        self._ensure_cosmos()
        now = datetime.utcnow()
        session = {
            "id": f"sess_{uuid.uuid4().hex}",
            "session_id": secrets.token_urlsafe(48),
            "user_id": user_id,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(days=self.session_ttl_days)).isoformat(),
        }
        return self.cosmos.upsert_item(self.cosmos.session_container_name, session)

    def get_session(self, session_id: str) -> Optional[Dict]:
        self._ensure_cosmos()
        session = self.cosmos.get_item(self.cosmos.session_container_name, "session_id", session_id)
        if not session:
            return None

        expires_at = session.get("expires_at")
        if not expires_at:
            return None

        if datetime.fromisoformat(expires_at) <= datetime.utcnow():
            self.delete_session(session_id)
            return None

        return session

    def delete_session(self, session_id: str) -> None:
        self._ensure_cosmos()
        session = self.cosmos.get_item(self.cosmos.session_container_name, "session_id", session_id)
        if not session:
            return
        self.cosmos.delete_item(self.cosmos.session_container_name, session["id"])

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        self._ensure_cosmos()
        return self.cosmos.get_item(self.cosmos.user_container_name, "id", user_id)

