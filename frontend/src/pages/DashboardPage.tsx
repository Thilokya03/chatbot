import Sidebar from "../components/layout/Sidebar";
import "../App.css";

export default function DashboardPage() {
  return (
    <div className="flex page-enter">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="dashboard-title stagger-in" style={{ "--delay": "70ms" } as React.CSSProperties}>
          Dashboard
        </h1>
        <p className="dashboard-note stagger-in" style={{ "--delay": "110ms" } as React.CSSProperties}>
          Track chatbot performance and knowledge quality in one place.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card glass-panel stagger-in" style={{ "--delay": "150ms" } as React.CSSProperties}>
            <h2>Chatbots</h2>
            <p>Create and tune assistants with richer personality and context control.</p>
          </div>

          <div className="dashboard-card glass-panel stagger-in" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <h2>Knowledge Bases</h2>
            <p>Keep documents fresh and searchable with fast ingestion and indexing.</p>
          </div>

          <div className="dashboard-card glass-panel stagger-in" style={{ "--delay": "250ms" } as React.CSSProperties}>
            <h2>Conversations</h2>
            <p>Follow trends, identify quality dips, and improve response confidence.</p>
          </div>
        </div>
      </main>
    </div>
  );
}