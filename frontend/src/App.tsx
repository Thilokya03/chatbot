import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

type ThemeMode = "light-chat" | "dark-chat";

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light-chat", label: "Light" },
  { value: "dark-chat", label: "Dark" },
];

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("ui-theme") as ThemeMode | null;
    return savedTheme === "dark-chat" ? "dark-chat" : "light-chat";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell page-enter">
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

      <Routes>
        <Route
          path="/"
          element={<LoginPage />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
      </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;