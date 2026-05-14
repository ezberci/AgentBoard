import { useState, useEffect, useRef } from "react";
import { api } from "@/api/client";

const MCP_SNIPPET = `{
  "mcpServers": {
    "agentboard": {
      "command": "python",
      "args": ["-m", "agentboard.mcp"],
      "env": {
        "AGENTBOARD_URL": "http://localhost:8765"
      }
    }
  }
}`;

export function Settings() {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [modelsHealth, setModelsHealth] = useState<
    { id: number; name: string; env_var: string; env_present: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [h, mh] = await Promise.all([api.health(), api.modelsHealth()]);
        setHealth(h);
        setModelsHealth(mh);
      } catch (err) {
        console.error("Failed to load health:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copySnippet = async () => {
    await navigator.clipboard.writeText(MCP_SNIPPET);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

      <section className="mb-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-200">Backend Health</h2>
        {loading ? (
          <div className="text-base text-muted-fg">Checking…</div>
        ) : health ? (
          <div className="flex items-center gap-2 text-base">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-200">API reachable — {health.status}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-base">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-400">API unreachable</span>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-200">Model Environment Checks</h2>
        {loading ? (
          <div className="text-base text-muted-fg">Checking…</div>
        ) : modelsHealth.length === 0 ? (
          <div className="text-base text-muted-fg">No models configured.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {modelsHealth.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2">
                <span className="text-base text-zinc-200">{m.name}</span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-surface px-2.5 py-0.5 text-sm text-muted-fg">{m.env_var}</code>
                  {m.env_present ? (
                    <span className="rounded bg-emerald-500/20 px-2.5 py-0.5 text-sm font-semibold text-emerald-400">OK</span>
                  ) : (
                    <span className="rounded bg-red-500/20 px-2.5 py-0.5 text-sm font-semibold text-red-400">Missing</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-200">MCP Server Snippet</h2>
          <button
            onClick={copySnippet}
            className="rounded-md bg-accent px-4 py-2 text-base font-medium text-white transition hover:bg-accent/90"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-surface-sunken p-4 text-sm text-zinc-300">
          <code>{MCP_SNIPPET}</code>
        </pre>
      </section>
    </div>
  );
}
