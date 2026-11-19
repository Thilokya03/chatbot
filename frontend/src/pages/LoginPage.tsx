import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";

export default function LoginPage() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleLogin() {
    try {
      await loginUser({
        email,
        password,
      });

      navigate("/dashboard");
    } catch {
      alert("Login Failed");
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
          Login
        </h1>

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
          onClick={handleLogin}
          className="
          bg-blue-600
          text-white
          p-2
          rounded
          w-full
        "
        >
          Login
        </button>
      </div>
    </div>
  );
}