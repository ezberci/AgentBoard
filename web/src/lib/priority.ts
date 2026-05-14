export function priorityLabel(priority: number): string {
  if (priority <= 1) return "P1";
  if (priority <= 2) return "P2";
  if (priority <= 3) return "P3";
  return "P4";
}

export function priorityClass(priority: number): string {
  if (priority <= 1) return "bg-red-500/20 text-red-400";
  if (priority <= 2) return "bg-amber-500/20 text-amber-400";
  if (priority <= 3) return "bg-blue-500/20 text-blue-400";
  return "bg-zinc-500/20 text-zinc-400";
}
