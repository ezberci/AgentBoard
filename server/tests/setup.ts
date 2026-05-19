import { prisma } from "../src/prisma/client.js";

beforeAll(async () => {
  // Ensure clean state for test runs if needed
});

afterEach(async () => {
  // Rollback or clean test data between tests
  const tablenames = [
    "task_runs",
    "task_comments",
    "agent_skills",
    "tasks",
    "columns",
    "skills",
    "agents",
    "models",
    "projects",
  ];
  for (const name of tablenames) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${name};`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
