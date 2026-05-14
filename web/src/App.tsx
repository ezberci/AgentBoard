import { useState } from "react";
import { Board } from "@/pages/Board";
import { Agents } from "@/pages/Agents";
import { Skills } from "@/pages/Skills";
import { Models } from "@/pages/Models";

type Page = "board" | "agents" | "skills" | "models";

export function App() {
  const [page, setPage] = useState<Page>("board");

  return (
    <div className="flex h-screen flex-col bg-surface-sunken text-zinc-100">
      <nav className="flex items-center gap-2 border-b border-border bg-surface px-6 py-3">
        <h1 className="mr-4 text-lg font-bold tracking-tight">Vibe Kanban</h1>
        <NavButton active={page === "board"} onClick={() => setPage("board")}>
          Board
        </NavButton>
        <NavButton active={page === "agents"} onClick={() => setPage("agents")}>
          Agents
        </NavButton>
        <NavButton active={page === "skills"} onClick={() => setPage("skills")}>
          Skills
        </NavButton>
        <NavButton active={page === "models"} onClick={() => setPage("models")}>
          Models
        </NavButton>
      </nav>

      <main className="flex-1 overflow-auto">
        {page === "board" && <Board />}
        {page === "agents" && <Agents />}
        {page === "skills" && <Skills />}
        {page === "models" && <Models />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-accent text-white"
          : "text-muted-fg hover:bg-surface-raised hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
