export interface Chatbot {
  id: string;
  name: string;
  type: "normal" | "knowledge_base";
  kb_id?: string;
  created_at: string;
}

export interface CreateChatbotRequest {
  name: string;
  type: "normal" | "knowledge_base";
  kb_id?: string;
}