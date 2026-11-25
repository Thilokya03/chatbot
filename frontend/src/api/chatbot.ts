import { api } from "./client";
import type { Chatbot, CreateChatbotRequest } from "../types/chatbot";
import type { ChatbotApiAccess, ChatbotUsageSummary } from "../types/apiAccess";

export const getChatbots = () =>
  api.get<Chatbot[]>("/chatbots");

export const createChatbot = (payload: CreateChatbotRequest) =>
  api.post<Chatbot>("/chatbots", payload);

export const getChatbot = (id: string) =>
  api.get<Chatbot>(`/chatbots/${id}`);

export const renameChatbot = (id: string, name: string) =>
  api.patch(`/chatbots/${id}`, { name });

export const deleteChatbot = (id: string) =>
  api.delete(`/chatbots/${id}`);

export const getChatbotApiAccess = (id: string) =>
  api.get<ChatbotApiAccess>(`/chatbots/${id}/api-access`);

export const getChatbotUsageSummary = () =>
  api.get<ChatbotUsageSummary[]>("/chatbots/usage/summary");