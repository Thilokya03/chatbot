import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api/auth";

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
    <div
      className="
      h-screen
      flex
      items-center
      justify-center
      bg-slate-100
    "
    >
      <div
        className="
        bg-white
        p-8
        rounded-lg
        shadow
        w-96
      "
      >
        <h1
          className="
          text-2xl
          font-bold
          mb-5
        "
        >
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h1>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`p-2 rounded w-full ${
              mode === "signin"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`p-2 rounded w-full ${
              mode === "signup"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        {mode === "signup" && (
          <input
            className="
            border
            p-2
            w-full
            mb-3
          "
            placeholder="Name (optional)"
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
          />
        )}

        <input
          className="
          border
          p-2
          w-full
          mb-3
        "
          placeholder="Email"
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
        />

        <input
          type="password"
          className="
          border
          p-2
          w-full
          mb-4
        "
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
          className="
          bg-blue-600
          text-white
          p-2
          rounded
          w-full
          disabled:opacity-70
        "
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
            ? "Login"
            : "Create Account"}
        </button>

        {error && (
          <p className="text-red-600 text-sm mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}