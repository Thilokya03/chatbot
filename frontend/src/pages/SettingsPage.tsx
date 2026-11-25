import { Link } from "react-router-dom";

export default function SettingsPage() {
  return (
    <main className="dashboard-container page-enter">
      <header className="workspace-topbar">
        <div className="brand-lockup"><span><strong>Settings</strong><small>Manage account and API access</small></span></div>
        <div className="dashboard-actions">
          <Link to="/dashboard" className="secondary-btn" style={{ textDecoration: "none", padding: "0.5rem 0.9rem" }}>Dashboard</Link>
        </div>
      </header>

      <section className="workspace-panel" style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
        <h2 style={{ margin: 0 }}>API Access</h2>
        <p style={{ margin: 0 }}>Open the separate API page to manage chatbot API keys and usage.</p>
        <div>
          <Link to="/api-access" className="primary-btn" style={{ textDecoration: "none", display: "inline-flex", padding: "0.55rem 0.95rem" }}>
            Go to API Page
          </Link>
        </div>
      </section>
    </main>
  );
}
