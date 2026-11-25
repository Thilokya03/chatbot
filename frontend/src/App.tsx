import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ApiAccessPage from "./pages/ApiAccessPage";
import ChatPage from "./pages/ChatPage";

type ThemeMode = "light-chat" | "dark-chat";

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light-chat", label: "Light" },
  { value: "dark-chat", label: "Dark" },
];

function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const isLogin = location.pathname === "/";
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("ui-theme") as ThemeMode | null;
    return savedTheme === "light-chat" ? "light-chat" : "dark-chat";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  return (
    <div className={`app-shell page-enter ${isDashboard ? "app-shell-dashboard" : ""} ${isLogin ? "app-shell-login" : ""}`}>
      {!isDashboard && (
        <div className="theme-switcher glass-panel">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={theme === option.value ? "is-active" : ""}
              aria-pressed={theme === option.value}
            >
              {option.value === "light-chat" ? <Sun size={14} /> : <Moon size={14} />}
              {option.label}
            </button>
          ))}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPage theme={theme} onThemeChange={setTheme} />}
        />
        <Route
          path="/api-access"
          element={<ApiAccessPage />}
        />
        <Route
          path="/chat/:chatbotId"
          element={<ChatPage />}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;