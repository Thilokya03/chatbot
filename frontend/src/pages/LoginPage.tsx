import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        mode === "signin" ? "Login failed. Check your email and password." : "Could not create your account.",
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page-enter">
      <div className="auth-card glass-panel stagger-in" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <h1 className="auth-title stagger-in" style={{ "--delay": "120ms" } as React.CSSProperties}>
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h1>
        <p className="auth-subtitle stagger-in" style={{ "--delay": "150ms" } as React.CSSProperties}>
          Access your workspace and manage chatbots faster.
        </p>

        <div className="mode-switch stagger-in" style={{ "--delay": "180ms" } as React.CSSProperties}>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={mode === "signin" ? "active" : ""}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={mode === "signup" ? "active" : ""}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className="auth-input stagger-in"
              style={{ "--delay": "210ms" } as React.CSSProperties}
              placeholder="Name (optional)"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}

          <input
            type="email"
            autoComplete="email"
            className="auth-input stagger-in"
            style={{ "--delay": "240ms" } as React.CSSProperties}
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            className="auth-input stagger-in"
            style={{ "--delay": "270ms" } as React.CSSProperties}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="auth-submit stagger-in"
            style={{ "--delay": "300ms" } as React.CSSProperties}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Login" : "Create Account"}
          </button>
        </form>

        {error && (
          <p className="auth-error">{error}</p>
        )}
      </div>
    </div>
  );
}