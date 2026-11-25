import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bot,
  ChevronDown,
  Database,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logoutUser, me } from "../api/auth";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  sendMessage,
} from "../api/chat";
import { createChatbot, getChatbots } from "../api/chatbot";
import { createKnowledgeBase, uploadKnowledgeDocument } from "../api/knowledgeBase";
import { getApiErrorMessage } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { Conversation, Message } from "../types/chat";
import type { Chatbot, CreateChatbotRequest } from "../types/chatbot";
import "../App.css";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatbotSearch, setChatbotSearch] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");

  const [newBotName, setNewBotName] = useState("");
  const [newBotType, setNewBotType] = useState<CreateChatbotRequest["type"]>("normal");
  const [newBotKbId, setNewBotKbId] = useState("");
  const [newKbName, setNewKbName] = useState("");
  const [newKbId, setNewKbId] = useState("");
  const [uploadFilename, setUploadFilename] = useState("");
  const [uploadApiKey, setUploadApiKey] = useState("");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingChatbots, setLoadingChatbots] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedChatbot = useMemo(
    () => chatbots.find((bot) => bot.id === selectedChatbotId) ?? null,
    [chatbots, selectedChatbotId],
  );
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const selectedChatbotInitials = useMemo(() => {
    if (!selectedChatbot?.name) return "AI";
    return selectedChatbot.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [selectedChatbot]);
  const filteredChatbots = useMemo(
    () => chatbots.filter((bot) => bot.name.toLowerCase().includes(chatbotSearch.trim().toLowerCase())),
    [chatbots, chatbotSearch],
  );
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) =>
      (conversation.title || "New chat").toLowerCase().includes(conversationSearch.trim().toLowerCase()),
    ),
    [conversations, conversationSearch],
  );

  const refreshChatbots = useCallback(async () => {
    setLoadingChatbots(true);
    try {
      const { data } = await getChatbots();
      setChatbots(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not load chatbots."));
    } finally {
      setLoadingChatbots(false);
    }
  }, []);

  const refreshConversations = useCallback(async (chatbotId: string) => {
    setLoadingConversations(true);
    try {
      const { data } = await getConversations(chatbotId);
      setConversations(data);
      setSelectedConversationId((current) =>
        data.some((conversation) => conversation.id === current) ? current : "",
      );
    } catch (requestError) {
      setConversations([]);
      setError(getApiErrorMessage(requestError, "Could not load conversations."));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    me().then(async ({ data }) => {
      if (!active) return;
      setUser(data);
      await refreshChatbots();
      if (active) setCheckingAuth(false);
    }).catch((requestError: unknown) => {
      if (!active) return;
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        setUser(null);
        navigate("/", { replace: true });
      } else {
        setError(getApiErrorMessage(requestError, "Could not verify your login."));
      }
      setCheckingAuth(false);
    });
    return () => {
      active = false;
    };
  }, [navigate, refreshChatbots, setUser]);

  async function handleSelectChatbot(chatbotId: string) {
    setSelectedChatbotId(chatbotId);
    setConversations([]);
    setSelectedConversationId("");
    setMessages([]);
    await refreshConversations(chatbotId);
  }

  async function handleSelectConversation(conversationId: string) {
    if (!selectedChatbotId) return;
    setSelectedConversationId(conversationId);
    setError("");
    setLoadingMessages(true);
    try {
      const { data } = await getConversation(selectedChatbotId, conversationId);
      setMessages(data.messages ?? []);
    } catch (requestError) {
      setMessages([]);
      setError(getApiErrorMessage(requestError, "Could not load this conversation."));
    } finally {
      setLoadingMessages(false);
    }
  }


  async function handleCreateChatbot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const payload: CreateChatbotRequest = {
        name: newBotName.trim(),
        type: newBotType,
        kb_id: newBotType === "knowledge_base" ? newBotKbId.trim() : undefined,
      };
      if (!payload.name) {
        setError("Enter a chatbot name.");
        return;
      }
      if (payload.type === "knowledge_base" && !payload.kb_id) {
        setError("Enter the knowledge base ID for this chatbot.");
        return;
      }
      const { data } = await createChatbot(payload);
      setUploadApiKey(data.api_key);
      setNewBotName("");
      await refreshChatbots();
      setSelectedChatbotId(data.id);
      setConversations([]);
      setSelectedConversationId("");
      setMessages([]);
      await refreshConversations(data.id);
      setNotice(`Created ${data.name}. Select it from the chatbot list to start chatting.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not create chatbot."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateKnowledgeBase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newKbName.trim()) {
      setError("Enter a knowledge base name.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await createKnowledgeBase(newKbName.trim());
      setNewKbId(data.id);
      setNewBotKbId(data.id);
      setNotice(`Knowledge base created. ID: ${data.id}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not create knowledge base."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChatbot?.kb_id || !uploadFilename.trim() || !uploadApiKey.trim()) {
      setError("Choose a knowledge-base chatbot and provide the backend filename and API key.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await uploadKnowledgeDocument({
        chatbot_id: selectedChatbot.id,
        kb_id: selectedChatbot.kb_id,
        filename: uploadFilename.trim(),
        apiKey: uploadApiKey.trim(),
      });
      setNotice("Document linked to the chatbot knowledge base.");
      setUploadFilename("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not link document."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewConversation() {
    if (!selectedChatbot) return;
    setError("");
    setSubmitting(true);
    try {
      const { data } = await createConversation(selectedChatbot.id);
      setConversations((current) => [data, ...current]);
      setSelectedConversationId(data.id);
      setMessages([]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not create a new chat."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!selectedChatbot || !window.confirm("Delete this conversation?")) return;
    setError("");
    try {
      await deleteConversation(selectedChatbot.id, conversationId);
      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      setConversations(remaining);
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(remaining[0]?.id ?? "");
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not delete the conversation."));
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChatbot || !selectedConversationId || !chatInput.trim()) return;
    const text = chatInput.trim();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await sendMessage(selectedChatbot.id, selectedConversationId, text);
      setMessages((current) => [
        ...current,
        { role: "user", content: text },
        { role: "assistant", content: data.reply },
      ]);
      setChatInput("");
      await refreshConversations(selectedChatbot.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not send message."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not log out."));
      return;
    }
    setUser(null);
    navigate("/", { replace: true });
  }

  if (checkingAuth) {
    return <main className="p-8">Checking your session...</main>;
  }
  if (!user) {
    return <main className="p-8">{error || "Redirecting to sign in..."}</main>;
  }

  return (
    <main className="dashboard-container page-enter">
      <header className="workspace-topbar">
        <a className="brand-lockup" href="/dashboard" aria-label="Orbit home">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>orbit</strong><small>AI workspace</small></span>
        </a>
        <div className="workspace-topbar-center">
          <span className="workspace-status-dot" />
          Your personal assistant studio
        </div>
        <div className="dashboard-actions">
          <div className="user-chip">
            <span className="user-avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
            <span className="user-email">{user.name || user.email}</span>
          </div>
          <button type="button" onClick={handleLogout} className="icon-btn logout-btn" aria-label="Log out" title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div className={`workspace-notice ${error ? "is-error" : "is-success"}`} role={error ? "alert" : "status"}>
          <span>{error || notice}</span>
          <button type="button" className="notice-dismiss" aria-label="Dismiss message" onClick={() => {
            setError("");
            setNotice("");
          }}>×</button>
        </div>
      )}

      <div className="chat-workspace">
        <aside className="chat-sidebar workspace-panel" aria-label="Assistant navigation">
          <div className="sidebar-section-heading">
            <div>
              <span className="eyebrow">YOUR SPACE</span>
              <h2>Assistants <span className="count-pill">{chatbots.length}</span></h2>
            </div>
            <button
              type="button"
              className="icon-btn subtle"
              onClick={() => void refreshChatbots()}
              disabled={loadingChatbots}
              aria-label="Refresh assistants"
              title="Refresh assistants"
            >
              <RefreshCw size={16} className={loadingChatbots ? "spin" : ""} />
            </button>
          </div>

          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search assistants"
              placeholder="Find an assistant"
              value={chatbotSearch}
              onChange={(event) => setChatbotSearch(event.target.value)}
            />
          </label>

          {loadingChatbots && <p className="sidebar-hint">Loading your assistants…</p>}
          {!loadingChatbots && filteredChatbots.length === 0 && (
            <div className="sidebar-empty">
              <span className="empty-icon"><Bot size={19} /></span>
              <strong>{chatbots.length ? "No matches" : "A space for ideas"}</strong>
              <span>{chatbots.length ? "Try another search." : "Create your first assistant below."}</span>
            </div>
          )}
          <nav className="chatbot-list" aria-label="Your assistants">
            {filteredChatbots.map((bot, index) => (
              <button
                type="button"
                key={bot.id}
                className={`chatbot-list-item ${bot.id === selectedChatbotId ? "selected" : ""}`}
                onClick={() => void handleSelectChatbot(bot.id)}
                disabled={submitting}
              >
                <span className={`assistant-icon assistant-icon-${index % 4}`}><Bot size={18} /></span>
                <span className="assistant-item-copy">
                  <strong>{bot.name}</strong>
                  <small>{bot.type === "knowledge_base" ? "Knowledge assistant" : "General assistant"}</small>
                </span>
                <span className="assistant-item-indicator" />
              </button>
            ))}
          </nav>

          <details className="management-panel">
            <summary><span className="manage-icon"><Plus size={16} /></span><span>Create assistant</span><ChevronDown size={15} /></summary>
            <form onSubmit={handleCreateChatbot}>
              <label className="field-label" htmlFor="new-bot-name">Assistant name</label>
              <input
                id="new-bot-name"
                className="auth-input"
                placeholder="e.g. Research buddy"
                value={newBotName}
                onChange={(event) => setNewBotName(event.target.value)}
                required
              />
              <label className="field-label" htmlFor="new-bot-type">Assistant type</label>
              <select
                id="new-bot-type"
                className="auth-input"
                value={newBotType}
                onChange={(event) => setNewBotType(event.target.value as CreateChatbotRequest["type"])}
              >
                <option value="normal">General assistant</option>
                <option value="knowledge_base">Knowledge assistant</option>
              </select>
              {newBotType === "knowledge_base" && (
                <input
                  className="auth-input"
                  placeholder="Knowledge base ID"
                  value={newBotKbId}
                  onChange={(event) => setNewBotKbId(event.target.value)}
                  required
                  aria-label="Knowledge base ID"
                />
              )}
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? "Creating…" : "Create assistant"}
              </button>
            </form>
          </details>

          <details className="management-panel knowledge-management">
            <summary><span className="manage-icon"><Database size={16} /></span><span>Knowledge sources</span><ChevronDown size={15} /></summary>
            <form onSubmit={handleCreateKnowledgeBase}>
              <label className="field-label" htmlFor="new-kb-name">New knowledge base</label>
              <input
                id="new-kb-name"
                className="auth-input"
                placeholder="Knowledge base name"
                value={newKbName}
                onChange={(event) => setNewKbName(event.target.value)}
              />
              <button type="submit" className="secondary-btn" disabled={submitting}>Create knowledge base</button>
            </form>
            {newKbId && <p className="kb-created">Created ID <code>{newKbId}</code></p>}
            <form onSubmit={handleUploadDocument}>
              <label className="field-label" htmlFor="document-name">Link an uploaded document</label>
              <input
                id="document-name"
                className="auth-input"
                placeholder="Backend filename"
                value={uploadFilename}
                onChange={(event) => setUploadFilename(event.target.value)}
              />
              <input
                className="auth-input"
                placeholder="Chatbot API key"
                value={uploadApiKey}
                onChange={(event) => setUploadApiKey(event.target.value)}
                aria-label="Chatbot API key"
              />
              <button type="submit" className="secondary-btn" disabled={submitting}>Link document</button>
            </form>
          </details>

          <div className="sidebar-footer">
            <span className="footer-orbit"><Sparkles size={14} /></span>
            <span>Make space for better ideas.</span>
          </div>
        </aside>

        <aside className="conversation-sidebar workspace-panel" aria-label="Chat history">
          <div className="sidebar-section-heading chats-heading">
            <div>
              <span className="eyebrow">{selectedChatbot ? selectedChatbot.name : "SELECT AN ASSISTANT"}</span>
              <h2>Chat history <span className="count-pill">{conversations.length}</span></h2>
            </div>
            <button
              type="button"
              className="icon-btn add-chat-btn"
              onClick={() => void handleNewConversation()}
              disabled={!selectedChatbot || submitting}
              aria-label="Start a new chat"
              title="Start a new chat"
            >
              <Plus size={18} />
            </button>
          </div>
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search chat history"
              placeholder="Search conversations"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              disabled={!selectedChatbot}
            />
          </label>
          {!selectedChatbot && <div className="sidebar-empty compact"><MessageCircle size={20} /><span>Choose an assistant to see your chats.</span></div>}
          {loadingConversations && <p className="sidebar-hint">Loading conversations…</p>}
          {selectedChatbot && !loadingConversations && conversations.length === 0 && (
            <div className="sidebar-empty compact"><MessageCircle size={20} /><span>No chats yet. Start a new conversation.</span></div>
          )}
          {selectedChatbot && !loadingConversations && conversations.length > 0 && filteredConversations.length === 0 && (
            <p className="sidebar-hint">No conversations match that search.</p>
          )}
          <nav className="conversation-list" aria-label="Conversations">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-list-item ${conversation.id === selectedConversationId ? "selected" : ""}`}
              >
                <button
                  type="button"
                  className="conversation-select"
                  onClick={() => void handleSelectConversation(conversation.id)}
                  disabled={submitting}
                >
                  <span className="conversation-icon"><MessageCircle size={16} /></span>
                  <span className="conversation-copy">
                    <strong>{conversation.title || "New chat"}</strong>
                    <small>{conversation.messages.length} {conversation.messages.length === 1 ? "message" : "messages"}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="conversation-delete"
                  onClick={() => void handleDeleteConversation(conversation.id)}
                  disabled={submitting}
                  aria-label={`Delete ${conversation.title || "conversation"}`}
                  title="Delete conversation"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </nav>
          <div className="history-tip">
            <span className="tip-star"><Sparkles size={14} /></span>
            <p>Your chats stay organized by assistant. Switch assistants to explore their separate histories.</p>
          </div>
        </aside>

        <section className="active-chat workspace-panel" aria-label="Chat conversation">
          <div className="active-chat-heading">
            <div className="active-chat-title-wrap">
              <div className="chatbot-avatar" aria-hidden="true">
                {selectedChatbot ? selectedChatbotInitials : <Sparkles size={20} />}
              </div>
              <div className="chat-heading-copy">
                <h2>{selectedChatbot?.name ?? "Your next idea starts here"}</h2>
                <p>
                  {selectedChatbot
                    ? selectedConversation?.title ?? "Start a new conversation"
                    : "A calmer space to think, create, and get things done."}
                </p>
              </div>
            </div>
            {selectedChatbot && (
              <div className="assistant-live-label"><span /> Ready to help</div>
            )}
          </div>

          <div className={`chat-messages ${messages.length === 0 ? "is-empty" : ""}`} aria-live="polite">
            {loadingMessages && <p className="chat-loading">Opening your conversation…</p>}
            {!loadingMessages && !selectedChatbot && (
              <div className="chat-welcome">
                <div className="welcome-orb"><Sparkles size={28} /></div>
                <span className="eyebrow">WELCOME TO ORBIT</span>
                <h3>Good conversations<br />start with a question.</h3>
                <p>Choose an assistant on the left, then start a fresh chat or pick up where you left off.</p>
              </div>
            )}
            {!loadingMessages && selectedChatbot && !selectedConversationId && (
              <div className="chat-welcome">
                <div className="welcome-orb"><MessageCircle size={26} /></div>
                <span className="eyebrow">A FRESH PAGE</span>
                <h3>What would you like<br />to work on?</h3>
                <p>Start a new chat with {selectedChatbot.name}. Your conversations stay separate and easy to find.</p>
                <button type="button" className="primary-btn welcome-start" onClick={() => void handleNewConversation()} disabled={submitting}>
                  <Plus size={17} /> Start a conversation
                </button>
              </div>
            )}
            {!loadingMessages && selectedConversationId && messages.length === 0 && (
              <div className="first-message">
                <div className="first-message-mark"><Sparkles size={18} /></div>
                <strong>Your conversation is ready</strong>
                <span>Send a message below and {selectedChatbot?.name} will join in.</span>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-row ${message.role}`}>
                <div className={`message-avatar ${message.role}`} aria-hidden="true">
                  {message.role === "user" ? (user.name || user.email).slice(0, 1).toUpperCase() : selectedChatbotInitials}
                </div>
                <div className={`chat-bubble ${message.role}`}>
                  <strong>{message.role === "user" ? "You" : selectedChatbot?.name}</strong>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="composer-wrap">
            <form className="chat-input-row" onSubmit={handleSend}>
              <textarea
                className="chat-composer-input"
                placeholder={selectedConversationId ? `Message ${selectedChatbot?.name ?? "your assistant"}…` : "Start a conversation to send a message"}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                disabled={!selectedConversationId || submitting || loadingMessages}
                aria-label="Write a message"
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!selectedConversationId || !chatInput.trim() || submitting || loadingMessages}
                aria-label="Send message"
                title="Send message"
              >
                {submitting ? <span className="send-spinner" /> : <Send size={17} />}
              </button>
            </form>
            <p className="composer-caption">Press <kbd>Enter</kbd> to send <span>·</span> <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line</p>
          </div>
        </section>
      </div>
    </main>
  );
}
