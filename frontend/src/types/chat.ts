export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  chatbot_id: string;
  conversation_id: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}