import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Bot,
  ChevronDown,
  Database,
  LogOut,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logoutUser, me, updatePassword, updateProfile } from "../api/auth";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  sendMessage,
} from "../api/chat";
import { createChatbot, deleteChatbot, getChatbots, renameChatbot } from "../api/chatbot";
import { createKnowledgeBase, uploadKnowledgeDocument } from "../api/knowledgeBase";
import { getApiErrorMessage } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { Conversation, Message } from "../types/chat";
import type { Chatbot, CreateChatbotRequest } from "../types/chatbot";
import "../App.css";

type ThemeMode = "light-chat" | "dark-chat";

type DashboardPageProps = {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
};

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light-chat", label: "Light" },
  { value: "dark-chat", label: "Dark" },
];

export default function DashboardPage({ theme, onThemeChange }: DashboardPageProps) {
  const navigate = useNavigate();
  const activeChatRef = useRef<HTMLElement>(null);
  const { user, setUser } = useAuthStore();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");

  const [newBotName, setNewBotName] = useState("");
  const [newBotType, setNewBotType] = useState<CreateChatbotRequest["type"]>("normal");
  const [newBotKbId, setNewBotKbId] = useState("");
  const [newKbName, setNewKbName] = useState("");
  const [newKbId, setNewKbId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingChatbots, setLoadingChatbots] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebar-hidden") !== "true");
  const [renameChatbotName, setRenameChatbotName] = useState("");
  const [accountName, setAccountName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) =>
      (conversation.title || "New chat").toLowerCase().includes(conversationSearch.trim().toLowerCase()),
    ),
    [conversations, conversationSearch],
  );
  const ownedChatbotCount = useMemo(
    () => chatbots.filter((bot) => bot.owned_by_user).length,
    [chatbots],
  );

  useEffect(() => {
    localStorage.setItem("sidebar-hidden", String(!sidebarOpen));
  }, [sidebarOpen]);

  const refreshChatbots = useCallback(async () => {
    setLoadingChatbots(true);
    try {
      const { data } = await getChatbots();
      setChatbots(data);
      return data;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not load chatbots."));
      return [];
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
      setAccountName(data.name ?? "");
      const availableChatbots = await refreshChatbots();
      const initialChatbot = availableChatbots.find((bot) => bot.is_default && bot.owned_by_user)
        ?? availableChatbots.find((bot) => bot.owned_by_user)
        ?? availableChatbots[0];
      if (active && initialChatbot) {
        setSelectedChatbotId(initialChatbot.id);
        setRenameChatbotName(initialChatbot.name);
        await refreshConversations(initialChatbot.id);
      }
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
  }, [navigate, refreshChatbots, refreshConversations, setUser]);

  async function handleSelectChatbot(chatbotId: string) {
    setSelectedChatbotId(chatbotId);
    setRenameChatbotName(chatbots.find((bot) => bot.id === chatbotId)?.name ?? "");
    setConversations([]);
    setSelectedConversationId("");
    setMessages([]);
    await refreshConversations(chatbotId);
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.requestAnimationFrame(() => activeChatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  async function handleSelectConversation(conversationId: string) {
    if (!selectedChatbotId) return;
    setSelectedConversationId(conversationId);
    setError("");
    setLoadingMessages(true);
    try {
      const { data } = await getConversation(selectedChatbotId, conversationId);
      setMessages(data.messages ?? []);
      if (window.matchMedia("(max-width: 640px)").matches) {
        window.requestAnimationFrame(() => activeChatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
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
      const { data } = await createChatbot(payload);
      setNewBotName("");
      await refreshChatbots();
      setSelectedChatbotId(data.id);
      setRenameChatbotName(data.name);
      setConversations([]);
      setSelectedConversationId("");
      setMessages([]);
      await refreshConversations(data.id);
      setNotice(`Created ${data.name}.`);
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
    if (!selectedChatbot?.kb_id || !uploadFile) {
      setError("Choose a knowledge-base chatbot and select a document to upload.");
      return;
    }
    if (uploadFile.size > 10 * 1024 * 1024) {
      setError("File size must not exceed 10 MB.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await uploadKnowledgeDocument(selectedChatbot.id, uploadFile);
      setNotice(`${uploadFile.name} uploaded to ${selectedChatbot.name}.`);
      setUploadFile(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not upload document."));
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

  async function handleSuggestedPrompt(prompt: string) {
    if (!selectedChatbot) return;
    setError("");
    setSubmitting(true);
    try {
      const { data } = await createConversation(selectedChatbot.id);
      setConversations((current) => [data, ...current]);
      setSelectedConversationId(data.id);
      setMessages([]);
      setChatInput(prompt);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not start a conversation."));
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

  async function handleRenameChatbot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChatbot) return;
    const nextName = renameChatbotName.trim();
    if (!nextName) {
      setError("Enter a chatbot name.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await renameChatbot(selectedChatbot.id, nextName);
      setChatbots((current) => current.map((bot) => (bot.id === selectedChatbot.id ? { ...bot, name: nextName } : bot)));
      setNotice("Chatbot name updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not rename this chatbot."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteChatbot() {
    if (!selectedChatbot || !window.confirm(`Delete "${selectedChatbot.name}" and its chat history?`)) return;
    setError("");
    setSubmitting(true);
    try {
      await deleteChatbot(selectedChatbot.id);
      const remaining = await refreshChatbots();
      setSelectedChatbotId("");
      setConversations([]);
      setSelectedConversationId("");
      setMessages([]);
      setUploadFile(null);
      const nextChatbot = remaining.find((bot) => bot.is_default && bot.owned_by_user)
        ?? remaining.find((bot) => bot.owned_by_user)
        ?? remaining[0];
      setRenameChatbotName(nextChatbot?.name ?? "");
      if (nextChatbot) {
        setSelectedChatbotId(nextChatbot.id);
        await refreshConversations(nextChatbot.id);
      }
      setNotice("Chatbot deleted.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not delete this chatbot."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await updateProfile({ name: accountName.trim() });
      setUser(data.user);
      setNotice("Profile name updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not update your profile."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await updatePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setNotice("Password updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not update your password."));
    } finally {
      setSubmitting(false);
    }
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
          <label className="assistant-picker-wrap">
            <span className="workspace-status-dot" />
            <select
              className="assistant-picker"
              aria-label="Choose assistant"
              value={selectedChatbotId}
              onChange={(event) => void handleSelectChatbot(event.target.value)}
              disabled={chatbots.length === 0 || submitting}
            >
              {chatbots.length === 0 && <option value="">No assistants yet</option>}
              {chatbots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </select>
          </label>
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={settingsOpen ? "Close workspace settings" : "Open workspace settings"}
            title={settingsOpen ? "Close workspace settings" : "Workspace settings"}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings2 size={17} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={sidebarOpen ? "Hide assistant sidebar" : "Show assistant sidebar"}
            title={sidebarOpen ? "Hide assistant sidebar" : "Show assistant sidebar"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
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

      <div className={`chat-workspace ${sidebarOpen ? "" : "sidebar-collapsed"} ${settingsOpen ? "" : "settings-closed"}`}>
        <aside className="chat-sidebar workspace-panel" aria-label="Chat history and sign out">
          <div className="sidebar-footer">
            <button type="button" onClick={handleLogout} className="sidebar-utility-button sidebar-logout-button">
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>

          <section className="sidebar-history" aria-label="Chat history">
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
          </section>
        </aside>

        <section ref={activeChatRef} className="active-chat workspace-panel" aria-label="Chat conversation">
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
                <p>Choose an assistant from the header, then start a fresh chat or pick up where you left off.</p>
              </div>
            )}
            {!loadingMessages && selectedChatbot && !selectedConversationId && (
              <div className="chat-welcome">
                <div className="welcome-orb"><MessageCircle size={26} /></div>
                <span className="eyebrow">A FRESH PAGE</span>
                <h3>What would you like<br />to work on?</h3>
                <p>Start a new chat with {selectedChatbot.name}. Your conversations stay separate and easy to find.</p>
                <div className="prompt-suggestions">
                  <span>Or start with a prompt</span>
                  {(selectedChatbot.type === "knowledge_base"
                    ? ["Summarize my documents", "Find key details in my files", "Answer a question about my documents"]
                    : ["Help me plan my week", "Draft a message", "Explain a complex idea"]
                  ).map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      onClick={() => void handleSuggestedPrompt(prompt)}
                      disabled={submitting}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
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

        {settingsOpen && (
          <aside className="conversation-sidebar workspace-panel" aria-label="Settings panel">
            <div className="sidebar-section-heading settings-panel-heading">
              <div>
                <span className="eyebrow">SETTINGS</span>
                <h2>Dashboard settings</h2>
              </div>
              <button
                type="button"
                className="icon-btn subtle"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close workspace settings"
                title="Close workspace settings"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sidebar-section-heading">
              <span className="count-pill" aria-label={`${ownedChatbotCount} of 10 assistants`} title={`${ownedChatbotCount} of 10 assistants`}>
                {ownedChatbotCount}/10 assistants
              </span>
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

            <details className="management-panel" open>
              <summary><span className="manage-icon"><Plus size={16} /></span><span>Create assistant</span><ChevronDown size={15} /></summary>
              <form onSubmit={handleCreateChatbot}>
                <label className="field-label" htmlFor="new-bot-name">Assistant name</label>
                <input
                  id="new-bot-name"
                  className="auth-input"
                  placeholder="e.g. Research buddy"
                  value={newBotName}
                  onChange={(event) => setNewBotName(event.target.value)}
                  maxLength={100}
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
                  <>
                    <input
                      className="auth-input"
                      placeholder="Knowledge base ID (optional)"
                      value={newBotKbId}
                      onChange={(event) => setNewBotKbId(event.target.value)}
                      aria-label="Knowledge base ID"
                    />
                    <span className="sidebar-hint">Leave blank to create a fresh document library.</span>
                  </>
                )}
                <button type="submit" className="primary-btn" disabled={submitting || ownedChatbotCount >= 10}>
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
                <span className="field-label">Upload to the selected knowledge chatbot</span>
                <label
                  className="document-dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setUploadFile(event.dataTransfer.files[0] ?? null);
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) => {
                      setUploadFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    disabled={selectedChatbot?.type !== "knowledge_base"}
                    aria-label="Choose a PDF, DOCX or TXT document"
                  />
                  <Database size={18} />
                  <span>{uploadFile?.name ?? "Drop a file here or browse"}</span>
                  <small>PDF, DOCX or TXT · 10 MB max</small>
                </label>
                <button
                  type="submit"
                  className="secondary-btn"
                  disabled={submitting || selectedChatbot?.type !== "knowledge_base" || !uploadFile}
                >
                  Upload document
                </button>
                {!selectedChatbot && <span className="sidebar-hint">Select a knowledge chatbot first.</span>}
              </form>
            </details>

            <details className="management-panel">
              <summary><span className="manage-icon"><Sparkles size={16} /></span><span>Account settings</span><ChevronDown size={15} /></summary>
              <form onSubmit={handleUpdateName}>
                <label className="field-label" htmlFor="account-name">Display name</label>
                <input
                  id="account-name"
                  className="auth-input"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  required
                />
                <button type="submit" className="secondary-btn" disabled={submitting}>Update name</button>
              </form>
              <form onSubmit={handleUpdatePassword}>
                <label className="field-label" htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  className="auth-input"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
                <label className="field-label" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  className="auth-input"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <button type="submit" className="secondary-btn" disabled={submitting}>Change password</button>
              </form>
            </details>

            <details className="management-panel">
              <summary><span className="manage-icon"><Sun size={16} /></span><span>Appearance</span><ChevronDown size={15} /></summary>
              <div className="theme-switcher sidebar-theme-switcher" role="group" aria-label="Choose appearance">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onThemeChange(option.value)}
                    className={theme === option.value ? "is-active" : ""}
                    aria-pressed={theme === option.value}
                  >
                    {option.value === "light-chat" ? <Sun size={14} /> : <Moon size={14} />}
                    {option.label}
                  </button>
                ))}
              </div>
            </details>

            <details className="management-panel" open>
              <summary><span className="manage-icon"><Bot size={16} /></span><span>Chatbot settings</span><ChevronDown size={15} /></summary>
              <form onSubmit={handleRenameChatbot}>
                <label className="field-label" htmlFor="rename-chatbot">Rename chatbot</label>
                <input
                  id="rename-chatbot"
                  className="auth-input"
                  value={renameChatbotName}
                  onChange={(event) => setRenameChatbotName(event.target.value)}
                  placeholder="Select chatbot first"
                  disabled={!selectedChatbot}
                />
                <p className="sidebar-hint" style={{ margin: 0 }}>
                  Type: {selectedChatbot ? (selectedChatbot.type === "knowledge_base" ? "Knowledge assistant" : "General assistant") : "-"}
                </p>
                <button type="submit" className="secondary-btn" disabled={!selectedChatbot?.can_manage || submitting}>Save chatbot</button>
              </form>
              <button
                type="button"
                className="secondary-btn danger-btn"
                disabled={!selectedChatbot?.can_manage || submitting}
                onClick={() => void handleDeleteChatbot()}
              >
                <Trash2 size={14} /> Delete selected chatbot
              </button>
            </details>

          </aside>
        )}
      </div>
    </main>
  );
}
