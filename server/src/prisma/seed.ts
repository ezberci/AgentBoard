import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(import.meta.dirname, "../../.env") });

import { prisma } from "../prisma/client.js";

async function main() {
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  } catch {
    // Ignore — may fail if driver disallows result-returning pragmas in executeRaw
  }

  // Clean existing data (order matters for FK constraints)
  const tables = [
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
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${t};`);
  }

  const project = await prisma.project.create({
    data: { name: "Agent Board", description: "Main board", slug: "agent-board" },
  });

  const columns = await prisma.$transaction([
    prisma.column.create({ data: { project_id: project.id, name: "Backlog", position: 0, is_terminal: false } }),
    prisma.column.create({ data: { project_id: project.id, name: "Todo", position: 1, is_terminal: false } }),
    prisma.column.create({ data: { project_id: project.id, name: "In Progress", position: 2, is_terminal: false } }),
    prisma.column.create({ data: { project_id: project.id, name: "Review", position: 3, is_terminal: false } }),
    prisma.column.create({ data: { project_id: project.id, name: "Done", position: 4, is_terminal: true } }),
  ]);

  const agentNames = [
    "Alpha-Bot",
    "Beta-Bot",
    "Gamma-Bot",
    "Delta-Bot",
    "Epsilon-Bot",
  ];
  const agents = [];
  for (const name of agentNames) {
    agents.push(
      await prisma.agent.create({
        data: { name, system_prompt: `You are ${name}.` },
      })
    );
  }

  const skillSpecs = [
    { name: "Research", description: "Find information", instructions: "Search and summarize", allowed_tools: JSON.stringify(["web_search"]) },
    { name: "Code", description: "Write code", instructions: "Implement features", allowed_tools: JSON.stringify(["code_editor"]) },
    { name: "Review", description: "Code review", instructions: "Review pull requests", allowed_tools: JSON.stringify(["code_editor", "git"]) },
    { name: "Test", description: "Write tests", instructions: "Unit and integration tests", allowed_tools: JSON.stringify(["pytest"]) },
    { name: "Deploy", description: "Deploy services", instructions: "CI/CD pipelines", allowed_tools: JSON.stringify(["docker", "kubernetes"]) },
    { name: "Design", description: "UI/UX design", instructions: "Create mockups", allowed_tools: JSON.stringify(["figma"]) },
    { name: "Docs", description: "Documentation", instructions: "Write docs and guides", allowed_tools: JSON.stringify(["markdown"]) },
    { name: "Analytics", description: "Data analysis", instructions: "Analyze metrics", allowed_tools: JSON.stringify(["sql", "python"]) },
  ];
  const skills = [];
  for (const s of skillSpecs) {
    skills.push(await prisma.skill.create({ data: s }));
  }

  const toolSpecs = [
    { name: "Read File", description: "Read the contents of a file or list directory entries.", handler_key: "read" },
    { name: "Edit File", description: "Replace an exact string in a file.", handler_key: "edit" },
    { name: "Write File", description: "Create or overwrite a file.", handler_key: "write" },
    { name: "Apply Patch", description: "Apply a patch to add, update, move, or delete files.", handler_key: "apply_patch" },
    { name: "Shell", description: "Execute a shell command and return its output.", handler_key: "shell" },
    { name: "Background Task", description: "Spawn a shell command as a background task.", handler_key: "task" },
    { name: "Task Status", description: "Check the status of a background task by ID.", handler_key: "task_status" },
    { name: "Web Search", description: "Search the web using DuckDuckGo.", handler_key: "websearch" },
    { name: "Web Fetch", description: "Fetch a URL and return its text content.", handler_key: "webfetch" },
    { name: "Repo Overview", description: "Summarize a repository structure.", handler_key: "repo_overview" },
    { name: "Repo Clone", description: "Clone a git repository.", handler_key: "repo_clone" },
    { name: "Glob Search", description: "Find files matching a glob pattern.", handler_key: "glob" },
    { name: "Grep Search", description: "Search file contents with regex.", handler_key: "grep" },
    { name: "Todo List", description: "Manage a todo list for the current run.", handler_key: "todo" },
    { name: "Plan", description: "Create a structured plan with steps.", handler_key: "plan" },
    { name: "Plan Enter", description: "Signal the start of a planning phase.", handler_key: "plan_enter" },
    { name: "Plan Exit", description: "Signal the end of a planning phase.", handler_key: "plan_exit" },
    { name: "Question", description: "Ask the user a clarifying question.", handler_key: "question" },
    { name: "Truncate", description: "Truncate content to a max length.", handler_key: "truncate" },
    { name: "Truncation Dir", description: "List directory entries with truncation.", handler_key: "truncation_dir" },
    { name: "Skill Invoke", description: "Invoke another skill by name.", handler_key: "skill" },
  ];
  const tools = [];
  for (const t of toolSpecs) {
    tools.push(await prisma.tool.create({ data: t }));
  }

  for (let i = 0; i < agents.length; i++) {
    await prisma.agent.update({
      where: { id: agents[i].id },
      data: {
        agentSkills: { create: { skill_id: skills[i % skills.length].id } },
        agentTools: { create: { tool_id: tools[i % tools.length].id } },
      },
    });
  }

  const taskTitles = [
    "Set up repo",
    "Design schema",
    "Implement models",
    "Write migrations",
    "Build API routes",
    "Add auth middleware",
    "Create React app",
    "Set up Tailwind",
    "Build Kanban board",
    "Add drag and drop",
    "Integrate WebSockets",
    "Write unit tests",
    "Write integration tests",
    "Set up CI",
    "Deploy to staging",
    "Performance audit",
    "Add logging",
    "Error handling",
    "Write documentation",
    "User feedback loop",
    "Finalize release",
    "Celebrate launch",
  ];
  for (let idx = 0; idx < taskTitles.length; idx++) {
    const col = columns[idx % columns.length];
    const agent = agents[idx % agents.length];
    await prisma.task.create({
      data: {
        project_id: project.id,
        column_id: col.id,
        title: taskTitles[idx],
        description: `Details for ${taskTitles[idx]}`,
        priority: (idx % 4) + 1,
        assigned_agent_id: agent.id,
      },
    });
  }

  const task0 = await prisma.task.findFirst({ where: { project_id: project.id }, orderBy: { id: "asc" } });
  const task1 = await prisma.task.findFirst({ where: { project_id: project.id }, orderBy: { id: "asc" }, skip: 1 });
  const task2 = await prisma.task.findFirst({ where: { project_id: project.id }, orderBy: { id: "asc" }, skip: 2 });
  if (task0) await prisma.taskComment.create({ data: { task_id: task0.id, author: "Alice", body: "Great start!" } });
  if (task1) await prisma.taskComment.create({ data: { task_id: task1.id, author: "Bob", body: "Needs more indexes." } });
  if (task2) await prisma.taskComment.create({ data: { task_id: task2.id, author: "Charlie", body: "Looks good to me." } });

  console.log(`Seeded ${taskTitles.length} tasks, ${agents.length} agents, ${tools.length} tools`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
