const AGENT_PALETTE: Record<string, string> = {
  fb: "#ef4444",
  na: "#a1a1aa",
  ab: "#f59e0b",
  cd: "#10b981",
  ef: "#3b82f6",
  gh: "#8b5cf6",
  ij: "#ec4899",
  kl: "#14b8a6",
  mn: "#f97316",
  op: "#6366f1",
  qr: "#84cc16",
  st: "#06b6d4",
  uv: "#d946ef",
  wx: "#eab308",
  yz: "#22c55e",
};

export function resolveAgentColor(colorSlug: string | undefined): string | undefined {
  if (!colorSlug) return undefined;
  return AGENT_PALETTE[colorSlug] ?? `hsl(${(colorSlug.charCodeAt(0) * 37) % 360}, 70%, 60%)`;
}
