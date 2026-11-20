import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

try:
    from azure.cosmos import CosmosClient, exceptions
except ImportError:  # pragma: no cover
    CosmosClient = None
    exceptions = None

load_dotenv()


class CosmosStore:
    def __init__(self) -> None:
        self.endpoint = os.getenv("COSMOS_ENDPOINT")
        self.key = os.getenv("COSMOS_KEY")
        self.database_name = os.getenv("COSMOS_DATABASE", "ChatbotPlatformDB")
        self.chatbot_container_name = os.getenv("COSMOS_CHATBOT_CONTAINER", "chatbots")
        self.conversation_container_name = os.getenv("COSMOS_CONVERSATION_CONTAINER", "conversations")
        self.kb_container_name = os.getenv("COSMOS_KB_CONTAINER", "knowledge_bases")
        self.user_container_name = os.getenv("COSMOS_USER_CONTAINER", "users")
        self.session_container_name = os.getenv("COSMOS_SESSION_CONTAINER", "sessions")
        self.client = None
        self.database = None
        self.last_error: Optional[str] = None
        self._configured = bool(CosmosClient and self.endpoint and self.key)

    @property
    def enabled(self) -> bool:
        return self.database is not None

    @property
    def configured(self) -> bool:
        return self._configured

    def ensure_connected(self) -> bool:
        if self.database is not None:
            return True
        if not self._configured:
            self.last_error = "Cosmos is not configured"
            return False

        try:
            self.client = CosmosClient(self.endpoint, credential=self.key)
            self.database = self.client.create_database_if_not_exists(id=self.database_name)
            self._ensure_container(self.chatbot_container_name)
            self._ensure_container(self.conversation_container_name)
            self._ensure_container(self.kb_container_name)
            self._ensure_container(self.user_container_name)
            self._ensure_container(self.session_container_name)
            self.last_error = None
            return True
        except Exception as exc:
            self.last_error = str(exc)
            self.client = None
            self.database = None
            return False

    def _ensure_container(self, container_name: str):
        return self.database.create_container_if_not_exists(
            id=container_name,
            partition_key={"paths": ["/tenant_id"], "kind": "Hash"},
            offer_throughput=400,
        )

    def _container(self, container_name: str):
        return self.database.get_container_client(container_name)

    def upsert_item(self, container_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
        if not self.ensure_connected():
            raise RuntimeError(self.last_error or "Cosmos DB is unavailable")
        payload = {"tenant_id": "default", **item}
        return self._container(container_name).upsert_item(payload)

    def get_item(self, container_name: str, field: str, value: Any) -> Optional[Dict[str, Any]]:
        if not self.ensure_connected():
            return None
        query = f"SELECT * FROM c WHERE c.tenant_id = @tenant AND c.{field} = @value"
        items = list(
            self._container(container_name).query_items(
                query=query,
                parameters=[
                    {"name": "@tenant", "value": "default"},
                    {"name": "@value", "value": value},
                ],
                enable_cross_partition_query=True,
            )
        )
        return items[0] if items else None

    def list_items(self, container_name: str) -> List[Dict[str, Any]]:
        if not self.ensure_connected():
            return []
        query = "SELECT * FROM c WHERE c.tenant_id = @tenant"
        return list(
            self._container(container_name).query_items(
                query=query,
                parameters=[{"name": "@tenant", "value": "default"}],
                enable_cross_partition_query=True,
            )
        )

    def delete_item(self, container_name: str, item_id: str) -> None:
        if not self.ensure_connected():
            return
        try:
            self._container(container_name).delete_item(item=item_id, partition_key="default")
        except Exception as exc:
            if exceptions is None or not isinstance(exc, exceptions.CosmosResourceNotFoundError):
                raise
