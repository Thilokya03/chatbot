export interface ChatbotApiAccess {
  chatbot_id: string;
  chatbot_name: string;
  api_key: string;
}

export interface ChatbotUsageSummary {
  chatbot_id: string;
  chatbot_name: string;
  conversation_count: number;
  message_count: number;
  last_activity_at?: string | null;
}
