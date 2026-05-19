import * as agentsService from "../services/agents.js";
import * as columnsService from "../services/columns.js";
import * as commentsService from "../services/comments.js";
import * as projectsService from "../services/projects.js";
import * as skillsService from "../services/skills.js";
import * as tasksService from "../services/tasks.js";
import { broadcastProject } from "../ws/manager.js";

export async function getContext(projectId?: number) {
  let currentProject = projectId
    ? await projectsService.getProject(projectId)
    : null;
  if (!currentProject) {
    const projects = await projectsService.listProjects();
    currentProject = projects[0] ?? null;
  }
  if (!currentProject) {
    return { current_project: null, columns: [], recent_tasks: [] };
  }
  const columns = await columnsService.listColumnsByProject(currentProject.id);
  const tasks = await tasksService.listTasksByProject(currentProject.id);
  const recentTasks = tasks
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    .slice(0, 10);
  return { current_project: currentProject, columns, recent_tasks: recentTasks };
}

export async function listProjects() {
  return projectsService.listProjects();
}

export async function getProject(projectId: number) {
  return projectsService.getProject(projectId);
}

export async function listTasks(
  projectId: number,
  status?: string,
  agentId?: number,
  priorityGte?: number
) {
  return tasksService.listTasksFiltered(projectId, status, agentId, priorityGte);
}

export async function getTask(taskId: number) {
  return tasksService.getTask(taskId);
}

export async function createTask(
  projectId: number,
  title: string,
  description?: string,
  priority?: number,
  agentId?: number
) {
  const columns = await columnsService.listColumnsByProject(projectId);
  const columnId = columns[0]?.id ?? null;
  const task = await tasksService.createTask({
    project_id: projectId,
    column_id: columnId,
    title,
    description,
    priority: priority ?? 4,
    assigned_agent_id: agentId,
  });
  await broadcastProject(task.project_id, "task.created", task);
  return task;
}

export async function updateTask(
  taskId: number,
  description?: string,
  result?: string,
  priority?: number
) {
  const task = await tasksService.getTask(taskId);
  if (!task) return null;
  const updated = await tasksService.updateTask(taskId, {
    description,
    result,
    priority,
    expected_version: task.version,
  });
  await broadcastProject(updated.project_id, "task.updated", updated);
  return updated;
}

export async function deleteTask(taskId: number) {
  const task = await tasksService.getTask(taskId);
  if (!task) return false;
  await tasksService.deleteTask(taskId);
  await broadcastProject(task.project_id, "task.deleted", { task_id: taskId });
  return true;
}

export async function listAgents() {
  return agentsService.listAgents();
}

export async function getAgent(agentId: number) {
  return agentsService.getAgent(agentId);
}

export async function listSkills() {
  return skillsService.listSkills();
}

export async function getSkill(skillId: number) {
  return skillsService.getSkill(skillId);
}

export async function assignAgentToTask(taskId: number, agentId: number) {
  const task = await tasksService.getTask(taskId);
  if (!task) return null;
  const updated = await tasksService.assignAgentToTask(taskId, agentId);
  await broadcastProject(updated.project_id, "task.updated", updated);
  return updated;
}

export async function unassignAgent(taskId: number) {
  const task = await tasksService.getTask(taskId);
  if (!task) return null;
  const updated = await tasksService.unassignAgent(taskId);
  await broadcastProject(updated.project_id, "task.updated", updated);
  return updated;
}

export async function claimNextTask(agentId: number, projectId: number) {
  const claimed = await tasksService.claimNextTask(agentId, projectId);
  if (!claimed) return null;
  await broadcastProject(projectId, "task.claimed", claimed);
  return claimed;
}

export async function completeTask(taskId: number, result: string) {
  const task = await tasksService.getTask(taskId);
  if (!task) return null;
  const completed = await tasksService.completeTask(taskId, result);
  await broadcastProject(completed.project_id, "task.completed", completed);
  return completed;
}

export async function addTaskComment(
  taskId: number,
  body: string,
  author = "MCP"
) {
  const task = await tasksService.getTask(taskId);
  if (!task) return null;
  const comment = await commentsService.createComment(taskId, { author, body });
  await broadcastProject(task.project_id, "comment.created", comment);
  return comment;
}
