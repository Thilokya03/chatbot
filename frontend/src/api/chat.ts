import { api } from "./client";
import type { Conversation } from "../types/chat";

export const sendMessage = (
  chatbotId: string,
  conversationId: string,
  message: string,
) =>
  api.post(
    "/chat",
    {
      chatbot_id: chatbotId,
      conversation_id: conversationId,
      message,
    }
  );

export const getConversations = (
  chatbotId: string,
): Promise<{ data: Conversation[] }> =>
  api.get(`/chatbots/${chatbotId}/conversations`);

export const createConversation = (
  chatbotId: string,
  title = "New chat",
) => api.post<Conversation>(`/chatbots/${chatbotId}/conversations`, { title });

export const getConversation = (chatbotId: string, conversationId: string) =>
  api.get<Conversation>(`/chatbots/${chatbotId}/conversations/${conversationId}`);

export const deleteConversation = (chatbotId: string, conversationId: string) =>
  api.delete(`/chatbots/${chatbotId}/conversations/${conversationId}`);