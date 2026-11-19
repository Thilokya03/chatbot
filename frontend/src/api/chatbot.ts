import { api } from "./client";

export const getChatbots = () =>
  api.get("/chatbots");

export const createChatbot = (payload: any) =>
  api.post("/chatbots", payload);

export const getChatbot = (id: string) =>
  api.get(`/chatbots/${id}`);