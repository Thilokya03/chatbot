import os
from typing import List

from dotenv import load_dotenv
from openai import AzureOpenAI
from pathlib import Path

load_dotenv()


class AzureOpenAIService:
    def __init__(self) -> None:
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.api_key = os.getenv("AZURE_OPENAI_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
        self.deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        self.embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

        self.client = None
        if self.endpoint and self.api_key and self.deployment:
            self.client = AzureOpenAI(
                api_key=self.api_key,
                azure_endpoint=self.endpoint,
                api_version=self.api_version,
            )

    def chat(self, messages: List[dict]) -> str:
        if not self.client:
            user_text = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    user_text = msg.get("content", "")
                    break
            return f"[MOCK] {user_text}" if user_text else "[MOCK] Hello"

        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    def generate_response(self, prompt: str) -> str:
        SYSTEM_PROMPT = (
            Path(__file__).resolve().parents[2] / "prompts" / "system_prompt.txt"
        ).read_text(encoding="utf-8")
        
        return self.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])

    def generate_chat_title(self, user_message: str, assistant_reply: str) -> str:
        if not self.client:
            return user_message.strip()[:60] or "New chat"

        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {
                    "role": "system",
                    "content": "Create a concise chat title of at most 6 words. Return only the title.",
                },
                {
                    "role": "user",
                    "content": f"User: {user_message[:1000]}\nAssistant: {assistant_reply[:1000]}",
                },
            ],
            max_tokens=20,
        )
        title = (response.choices[0].message.content or "").strip().strip("\"'`")
        return title[:80] or user_message.strip()[:60] or "New chat"

    def embed_text(self, text: str) -> List[float]:
        if not self.client or not self.embedding_deployment:
            return [0.0] * 8

        response = self.client.embeddings.create(
            model=self.embedding_deployment,
            input=text,
        )
        return response.data[0].embedding
