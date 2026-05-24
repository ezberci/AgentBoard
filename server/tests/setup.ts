import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "..", "test.db");

// Remove any existing test DB so each test run starts fresh.
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

process.env.DATABASE_URL = `file:${testDbPath}`;

const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

// Seed the global singleton with a test client before any test file imports
// the app's modules (which would otherwise create a file-based client).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
if (globalForPrisma.prisma) {
  await globalForPrisma.prisma.$disconnect();
}
const prisma = new PrismaClient();
globalForPrisma.prisma = prisma;

beforeAll(async () => {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table';"
  );
  if (tables.length === 0) {
    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
  }
});

afterEach(async () => {
  const tablenames = [
    "task_runs",
    "task_comments",
    "agent_tools",
    "agent_skills",
    "tasks",
    "columns",
    "tools",
    "skills",
    "agents",
    "models",
    "projects",
  ];
  for (const name of tablenames) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${name};`);
  }
});

// Intentionally omit afterAll/$disconnect so the test DB survives
// across test files in the same process (singleFork: true).
