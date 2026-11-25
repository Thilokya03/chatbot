import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Check, Copy, Database, Eye, EyeOff, Trash2 } from "lucide-react";

import { me } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { createChatbot, deleteChatbot, getChatbotApiAccess, getChatbotUsageSummary, getChatbots } from "../api/chatbot";
import { useAuthStore } from "../store/authStore";
import type { ChatbotApiAccess, ChatbotUsageSummary } from "../types/apiAccess";
import type { Chatbot } from "../types/chatbot";

export default function ApiAccessPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [usage, setUsage] = useState<ChatbotUsageSummary[]>([]);
  const [accessByChatbotId, setAccessByChatbotId] = useState<Record<string, ChatbotApiAccess>>({});
  const [newBotName, setNewBotName] = useState("");
  const [newBotType, setNewBotType] = useState<"normal" | "knowledge_base">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedLabel, setCopiedLabel] = useState("");

  useEffect(() => {
    me().then(({ data }) => {
      setUser(data);
    }).catch(() => {
      setUser(null);
      navigate("/", { replace: true });
    });
  }, [navigate, setUser]);

  useEffect(() => {
    if (!user) return;
    getChatbots().then(async ({ data }: { data: Chatbot[] }) => {
      setChatbots(data);
      const accessResults = await Promise.all(
        data.map(async (bot) => {
          const response = await getChatbotApiAccess(bot.id);
          return [bot.id, response.data] as const;
        }),
      );
      setAccessByChatbotId(Object.fromEntries(accessResults));
    }).catch((requestError) => setError(getApiErrorMessage(requestError, "Could not load chatbots.")));

    getChatbotUsageSummary().then(({ data }) => {
      setUsage(data);
    }).catch((requestError) => setError(getApiErrorMessage(requestError, "Could not load usage summary.")));
  }, [user]);

  const usageByChatbotId = useMemo(
    () => Object.fromEntries(usage.map((item) => [item.chatbot_id, item])),
    [usage],
  );
  const ownedChatbotCount = chatbots.filter((bot) => bot.owned_by_user).length;

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(""), 1800);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}. Select and copy the value instead.`);
    }
  }

  async function handleCreateChatbot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await createChatbot({ name: newBotName.trim(), type: newBotType });
      const [chatbotResponse, usageResponse] = await Promise.all([
        getChatbots(),
        getChatbotUsageSummary(),
      ]);
      const nextChatbots: Chatbot[] = chatbotResponse.data;
      const nextUsage: ChatbotUsageSummary[] = usageResponse.data;
      const nextAccess = await Promise.all(nextChatbots.map(async (bot: Chatbot) => {
        const { data } = await getChatbotApiAccess(bot.id);
        return [bot.id, data] as const;
      }));
      setChatbots(nextChatbots);
      setUsage(nextUsage);
      setAccessByChatbotId(Object.fromEntries(nextAccess));
      setNewBotName("");
      setNotice("Chatbot created. Your API key is ready below.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not create chatbot."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteChatbot(chatbot: Chatbot) {
    if (!window.confirm(`Delete "${chatbot.name}" and its chat history?`)) return;
    setError("");
    setSubmitting(true);
    try {
      await deleteChatbot(chatbot.id);
      setChatbots((current) => current.filter((bot) => bot.id !== chatbot.id));
      setUsage((current) => current.filter((item) => item.chatbot_id !== chatbot.id));
      setAccessByChatbotId((current) => {
        const next = { ...current };
        delete next[chatbot.id];
        return next;
      });
      setNotice("Chatbot deleted.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not delete chatbot."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <main className="dashboard-container page-enter">
      <header className="workspace-topbar">
        <div className="brand-lockup"><span><strong>API Access</strong><small>Manage external usage</small></span></div>
        <div className="dashboard-actions">
          <Link to="/dashboard" className="secondary-btn" style={{ textDecoration: "none", padding: "0.5rem 0.9rem" }}>Dashboard</Link>
        </div>
      </header>

      {error && <div className="workspace-notice is-error">{error}</div>}
      {notice && <div className="workspace-notice is-success">{notice}</div>}

      <section className="api-access-content">
        <form onSubmit={handleCreateChatbot} className="api-create-form">
          <div>
            <h2 style={{ margin: 0 }}>Create a chatbot</h2>
            <p className="sidebar-hint">{ownedChatbotCount} of 10 chatbot slots used. Knowledge bots start with an empty document library.</p>
          </div>
          <input
            className="auth-input"
            aria-label="Chatbot name"
            placeholder="Chatbot name"
            value={newBotName}
            onChange={(event) => setNewBotName(event.target.value)}
            required
            maxLength={100}
          />
          <select
            className="auth-input"
            aria-label="Chatbot type"
            value={newBotType}
            onChange={(event) => setNewBotType(event.target.value as "normal" | "knowledge_base")}
          >
            <option value="normal">General chatbot</option>
            <option value="knowledge_base">Knowledge-base chatbot</option>
          </select>
          <button type="submit" className="primary-btn" disabled={submitting || ownedChatbotCount >= 10}>
            {submitting ? "Creating…" : "Create chatbot"}
          </button>
        </form>
        {chatbots.length === 0 && (
          <div className="api-empty-state workspace-panel">
            <span className="welcome-orb"><Bot size={24} /></span>
            <h2>Your integrations start here</h2>
            <p>Create a chatbot to generate a private API key and connect it to your app.</p>
          </div>
        )}
        {chatbots.map((bot) => {
          const access = accessByChatbotId[bot.id];
          const selectedUsage = usageByChatbotId[bot.id];
          const apiTargetUrl = `${(import.meta.env.VITE_API_URL || window.location.origin.replace(/:517[34]$/, ":8000")).replace(/\/+$/, "")}/chat`;
          const isRevealed = revealedKeys[bot.id] ?? false;
          const apiKey = access?.api_key ?? "";

          return (
            <article key={bot.id} className="api-bot-card workspace-panel">
              <header className="api-bot-header">
                <div className="api-bot-identity">
                  <span className={`api-bot-icon ${bot.type === "knowledge_base" ? "knowledge" : ""}`}>
                    {bot.type === "knowledge_base" ? <Database size={19} /> : <Bot size={19} />}
                  </span>
                  <div>
                    <h3>{bot.name}</h3>
                    <span className="api-type-tag">{bot.type === "knowledge_base" ? "Knowledge assistant" : "General assistant"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-btn danger-btn api-delete-btn"
                  disabled={submitting || !bot.can_manage}
                  onClick={() => void handleDeleteChatbot(bot)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </header>

              <div className="api-credentials">
                <div className="api-credential">
                  <span className="api-credential-label">Chatbot ID</span>
                  <code>{bot.id}</code>
                </div>
                <div className="api-credential">
                  <span className="api-credential-label">API key</span>
                  <div className="api-credential-value">
                    <code>{apiKey ? (isRevealed ? apiKey : `••••••••${apiKey.slice(-4)}`) : "Loading key…"}</code>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={isRevealed ? "Hide API key" : "Show API key"}
                      title={isRevealed ? "Hide API key" : "Show API key"}
                      onClick={() => setRevealedKeys((current) => ({ ...current, [bot.id]: !isRevealed }))}
                      disabled={!apiKey}
                    >
                      {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Copy API key for ${bot.name}`}
                      title="Copy API key"
                      onClick={() => void copyValue(apiKey, `${bot.name} API key`)}
                      disabled={!apiKey}
                    >
                      {copiedLabel === `${bot.name} API key` ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
                <div className="api-credential api-target">
                  <span className="api-credential-label">Target URL</span>
                  <div className="api-credential-value">
                    <code>{apiTargetUrl}</code>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Copy target URL for ${bot.name}`}
                      title="Copy target URL"
                      onClick={() => void copyValue(apiTargetUrl, `${bot.name} target URL`)}
                    >
                      {copiedLabel === `${bot.name} target URL` ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <footer className="api-usage">
                <div><strong>{selectedUsage?.conversation_count ?? "—"}</strong><span>Conversations</span></div>
                <div><strong>{selectedUsage?.message_count ?? "—"}</strong><span>Messages</span></div>
                <p>Use your API key in the <code>x-api-key</code> request header.</p>
              </footer>
            </article>
          );
        })}
      </section>
    </main>
  );
}
