export function slugify(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "project";
}

export function slugToColor(name: string): string {
  const parts = name.split(/[\s\-]+/).filter(Boolean);
  const initials = parts.map((p) => p[0]).join("").slice(0, 2);
  return initials.toLowerCase() || "na";
}

export function deepCamel(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(deepCamel);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    result[camel] = deepCamel(value);
  }
  return result;
}

export function deepSnake<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(deepSnake) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    result[snake] = deepSnake(value);
  }
  return result as T;
}
