import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Database, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";

import { loginUser, registerUser } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuthStore } from "../store/authStore";
import "../App.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await registerUser({ name: name.trim() || undefined, email: email.trim(), password });
      }
      const { data } = await loginUser({ email: email.trim(), password });
      setUser(data.user);
      navigate("/dashboard");
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        mode === "signin" ? "Sign in failed. Check your email and password." : "Could not create your account.",
      ));
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-page page-enter">
      <section className="auth-card glass-panel" aria-label="Account access">
        <div className="auth-visual">
          <a className="auth-brand" href="/" aria-label="Orbit home">
            <span className="brand-mark"><Sparkles size={18} /></span>
            <span>orbit</span>
          </a>

          <div className="auth-visual-copy">
            <span className="eyebrow">YOUR AI WORKSPACE</span>
            <h2>Make room<br />for bigger ideas.</h2>
            <p>One calm place to chat, create assistants, and bring your own knowledge.</p>
          </div>

          <div className="auth-orbit-scene" aria-hidden="true">
            <span className="auth-orbit-ring auth-orbit-ring-one" />
            <span className="auth-orbit-ring auth-orbit-ring-two" />
            <span className="auth-orbit-glow" />
            <span className="auth-orbit-core"><Sparkles size={31} /></span>
            <span className="auth-float-card auth-float-card-top"><Bot size={16} /> Personal assistants</span>
            <span className="auth-float-card auth-float-card-bottom"><Database size={16} /> Your knowledge</span>
          </div>

          <div className="auth-benefits" aria-label="Workspace features">
            <span><Bot size={15} /> Up to 10 assistants</span>
            <span><KeyRound size={15} /> Your keys, your control</span>
          </div>
        </div>

        <div className="auth-content">
          <span className="auth-content-kicker">{mode === "signin" ? "WELCOME BACK" : "GET STARTED"}</span>
          <h1 className="auth-title">{mode === "signin" ? "Sign in to Orbit" : "Create your account"}</h1>
          <p className="auth-subtitle">
            {mode === "signin"
              ? "Pick up where your ideas left off."
              : "Your personal AI workspace is just a few details away."}
          </p>

          <div className="mode-switch" role="group" aria-label="Choose account action">
            <button type="button" onClick={() => changeMode("signin")} className={mode === "signin" ? "active" : ""} aria-pressed={mode === "signin"}>
              Sign in
            </button>
            <button type="button" onClick={() => changeMode("signup")} className={mode === "signup" ? "active" : ""} aria-pressed={mode === "signup"}>
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "signup" && (
              <label className="auth-field" htmlFor="account-name">
                <span>Name <small>Optional</small></span>
                <input
                  id="account-name"
                  className="auth-input"
                  type="text"
                  autoComplete="name"
                  placeholder="How should we address you?"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                />
              </label>
            )}

            <label className="auth-field" htmlFor="account-email">
              <span>Email address</span>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="auth-field" htmlFor="account-password">
              <span>Password</span>
              <span className="password-field">
                <input
                  id="account-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={mode === "signup" ? 8 : undefined}
                  className="auth-input"
                  placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-visibility"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-security-note">
            <KeyRound size={14} /> Your account and chatbot keys stay private.
          </p>
        </div>
      </section>
    </main>
  );
}
