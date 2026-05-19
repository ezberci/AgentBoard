import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(import.meta.dirname, "../../.env") });

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? fallback!;
}

export const env = {
  databaseUrl: getEnv("DATABASE_URL"),
  apiKey: getEnv("API_KEY", "dev-key-change-me"),
  port: Number(getEnv("PORT", "8765")),
  nodeEnv: getEnv("NODE_ENV", "development"),
};
