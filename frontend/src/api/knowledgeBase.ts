import { api } from "./client";

export const createKnowledgeBase = (name: string) =>
  api.post("/knowledge-bases", { name });

export const uploadKnowledgeDocument = (payload: {
  chatbot_id: string;
  kb_id: string;
  filename: string;
  apiKey: string;
}) =>
  api.post(
    "/knowledge-bases/upload",
    {
      chatbot_id: payload.chatbot_id,
      kb_id: payload.kb_id,
      filename: payload.filename,
    },
    {
      headers: {
        "x-api-key": payload.apiKey,
      },
    }
  );
