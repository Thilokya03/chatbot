export interface Chatbot {
  id: string;
  name: string;
  type: "normal" | "knowledge_base";
  kb_id?: string;
  created_at: string;
  api_key?: string;
  is_default?: boolean;
  owned_by_user?: boolean;
  can_manage?: boolean;
}

export interface CreateChatbotRequest {
  name: string;
  type: "normal" | "knowledge_base";
  kb_id?: string;
}