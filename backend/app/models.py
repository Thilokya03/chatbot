from pydantic import BaseModel

class ChatRequest(BaseModel):
    content: str


class ChatResponse(BaseModel):
    content: str


class ChatHistory:

    def __init__(self):
        self.history = []
        self.append_chat("system" , "You are a helpful assistant.")

    def append_chat(self, role: str, content: str):

        self.history.append(
            {
                "role": role,
                "content": content
            }
        )

    def get_history(self):
        return self.history

