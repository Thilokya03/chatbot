import os
from typing import List

from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv()


class AzureOpenAIService:
    def __init__(self) -> None:
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.api_key = os.getenv("AZURE_OPENAI_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
        self.deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")

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
        return self.chat([
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ])
