import Sidebar from "../components/layout/Sidebar";

export default function DashboardPage() {
  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1
          className="
          text-3xl
          font-bold
        "
        >
          Dashboard
        </h1>

        <div
          className="
          grid
          grid-cols-3
          gap-5
          mt-8
        "
        >
          <div className="border p-6 rounded">
            Chatbots
          </div>

          <div className="border p-6 rounded">
            Knowledge Bases
          </div>

          <div className="border p-6 rounded">
            Conversations
          </div>
        </div>
      </main>
    </div>
  );
}