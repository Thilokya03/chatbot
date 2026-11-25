import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createConversation,
  getConversation,
  getConversations,
  sendMessage,
} from "../api/chat";
import { getApiErrorMessage } from "../api/client";
import { uploadKnowledgeDocument } from "../api/knowledgeBase";
import { getChatbot } from "../api/chatbot";
import type { Conversation } from "../types/chat";
import type { Chatbot } from "../types/chatbot";

export default function ChatPage() {
  const { chatbotId = "" } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [message, setMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chatbotId) return;
    getChatbot(chatbotId).then(({ data }) => setChatbot(data)).catch(() => navigate("/dashboard", { replace: true }));
    getConversations(chatbotId).then(({ data }) => {
      setConversations(data);
      if (data[0]) setConversationId(data[0].id);
    }).catch((requestError) => setError(getApiErrorMessage(requestError, "Could not load conversations.")));
  }, [chatbotId, navigate]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversations, conversationId],
  );

  async function handleCreateConversation() {
    if (!chatbotId) return;
    const { data } = await createConversation(chatbotId);
    setConversations((current) => [data, ...current]);
    setConversationId(data.id);
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatbotId || !conversationId || !message.trim()) return;
    try {
      await sendMessage(chatbotId, conversationId, message.trim());
      const { data } = await getConversation(chatbotId, conversationId);
      setConversations((current) => current.map((item) => (item.id === conversationId ? data : item)));
      setMessage("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not send message."));
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatbot?.kb_id || !uploadFile) return;
    try {
      await uploadKnowledgeDocument(chatbot.id, uploadFile);
      setUploadFile(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not upload document."));
    }
  }

  return (
    <main className="dashboard-container page-enter">
      <header className="workspace-topbar">
        <div className="brand-lockup"><span><strong>{chatbot?.name || "Chat"}</strong><small>Dedicated chat page</small></span></div>
        <div className="dashboard-actions">
          <Link to="/dashboard" className="secondary-btn" style={{ textDecoration: "none", padding: "0.5rem 0.9rem" }}>Dashboard</Link>
          <Link to="/api-access" className="secondary-btn" style={{ textDecoration: "none", padding: "0.5rem 0.9rem" }}>API page</Link>
        </div>
      </header>

      {error && <div className="workspace-notice is-error">{error}</div>}

      <section className="workspace-panel" style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="button" className="secondary-btn" onClick={() => void handleCreateConversation()}>New conversation</button>
          <select className="auth-input" value={conversationId} onChange={(event) => setConversationId(event.target.value)}>
            {conversations.map((item) => <option key={item.id} value={item.id}>{item.title || "New chat"}</option>)}
          </select>
        </div>

        <div className="chat-thread" style={{ minHeight: "260px", padding: "0.8rem", borderRadius: "12px", border: "1px solid var(--line)" }}>
          {(activeConversation?.messages || []).map((item, index) => (
            <p key={`${item.role}-${index}`}><strong>{item.role}:</strong> {item.content}</p>
          ))}
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: "0.6rem" }}>
          <input className="auth-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message" />
          <button type="submit" className="primary-btn">Send</button>
        </form>

        {chatbot?.type === "knowledge_base" && (
          <form onSubmit={handleUpload} style={{ display: "grid", gap: "0.5rem" }}>
            <h3 style={{ margin: 0 }}>Upload a document</h3>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
            <button type="submit" className="secondary-btn" disabled={!uploadFile}>Upload document</button>
          </form>
        )}
      </section>
    </main>
  );
}
