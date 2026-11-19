import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside
      className="
      w-64
      h-screen
      bg-slate-900
      text-white
      p-5
    "
    >
      <h1
        className="
        text-2xl
        font-bold
        mb-8
      "
      >
        Chatbot Platform
      </h1>

      <nav className="flex flex-col gap-4">
        <Link to="/dashboard">
          Dashboard
        </Link>

        <Link to="/chatbots">
          Chatbots
        </Link>

        <Link to="/knowledge-bases">
          Knowledge Bases
        </Link>

        <Link to="/settings">
          Settings
        </Link>
      </nav>
    </aside>
  );
}