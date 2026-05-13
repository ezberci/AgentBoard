export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: number;
  project_id: number;
  name: string;
  position: number;
  is_terminal: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  column_id: number;
  title: string;
  description?: string;
  priority: number;
  result?: string;
  assigned_agent_id?: number;
  version: number;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: number;
  name: string;
  system_prompt?: string;
  color?: string;
  created_at: string;
  skills: Skill[];
}

export interface Skill {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  allowed_tools?: unknown;
  created_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author: string;
  body: string;
  created_at: string;
}
