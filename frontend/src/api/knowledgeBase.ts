import { api } from "./client";

export const createKnowledgeBase = (name: string) =>
  api.post("/knowledge-bases", { name });

export const uploadKnowledgeDocument = (chatbotId: string, file: File) => {
  const formData = new FormData();
  formData.append("chatbot_id", chatbotId);
  formData.append("file", file);
  return api.post("/knowledge-bases/upload", formData);
};
