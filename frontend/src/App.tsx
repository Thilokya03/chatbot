import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

type ThemeMode = "light-glass" | "dark-glass" | "sunset-glass";

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light-glass", label: "Light Glass" },
  { value: "dark-glass", label: "Dark Glass" },
  { value: "sunset-glass", label: "Sunset Glass" },
];

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("ui-theme") as ThemeMode | null;
    return savedTheme ?? "light-glass";
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
            >
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