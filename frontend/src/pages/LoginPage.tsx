import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/auth";
import "../App.css";

export default function LoginPage() {
  const navigate =
    useNavigate();

  const [mode, setMode] =
    useState<"signin" | "signup">("signin");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      await loginUser({
        email,
        password,
      });

      navigate("/dashboard");
    } catch {
      setError("Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError("");
    setLoading(true);

    try {
      await registerUser({
        name: name || undefined,
        email,
        password,
      });

      await loginUser({
        email,
        password,
      });

      navigate("/dashboard");
    } catch {
      setError("Sign up failed. This email may already be registered.");
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

        {mode === "signup" && (
          <input
            className="auth-input stagger-in"
            style={{ "--delay": "210ms" } as React.CSSProperties}
            placeholder="Name (optional)"
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
          />
        )}

        <input
          className="auth-input stagger-in"
          style={{ "--delay": "240ms" } as React.CSSProperties}
          placeholder="Email"
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
        />

        <input
          type="password"
          className="auth-input stagger-in"
          style={{ "--delay": "270ms" } as React.CSSProperties}
          placeholder="Password"
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <button
          onClick={
            mode === "signin"
              ? handleLogin
              : handleRegister
          }
          disabled={loading}
          className="auth-submit stagger-in"
          style={{ "--delay": "300ms" } as React.CSSProperties}
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
            ? "Login"
            : "Create Account"}
        </button>

        {error && (
          <p className="auth-error">{error}</p>
        )}
      </div>
    </div>
  );
}