export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  chatbot_id: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
}