import { api } from "./client";

export const sendMessage = (
  chatbotId: string,
  message: string,
  apiKey: string
) =>
  api.post(
    "/chat",
    {
      chatbot_id: chatbotId,
      message,
    },
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

export const getConversation = (
  chatbotId: string,
  apiKey: string
) =>
  api.get(
    `/conversations/${chatbotId}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );