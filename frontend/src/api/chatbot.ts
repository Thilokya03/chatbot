import { api } from "./client";
import type { CreateChatbotRequest } from "../types/chatbot";

export const getChatbots = () =>
  api.get("/chatbots");

export const createChatbot = (payload: CreateChatbotRequest) =>
  api.post("/chatbots", payload);

export const getChatbot = (id: string) =>
  api.get(`/chatbots/${id}`);