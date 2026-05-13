import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Task, TaskComment } from "@/types";

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

export function useBoard(projectId: number | null) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const columnsQuery = useQuery({
    queryKey: ["projects", projectId, "columns"],
    queryFn: () => api.getColumns(projectId!),
    enabled: projectId !== null,
  });

  const tasksQuery = useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => api.getTasks(projectId!),
    enabled: projectId !== null,
  });

  useEffect(() => {
    if (projectId === null) {
      return;
    }

    const connect = () => {
      const ws = new WebSocket(`ws://localhost:8765/ws/projects/${projectId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(event.data) as WsMessage;
        } catch {
          return;
        }

        const tasksKey = ["projects", projectId, "tasks"];
        const columnsKey = ["projects", projectId, "columns"];

        switch (msg.type) {
          case "task.moved": {
            const moved = msg.payload as unknown as Task;
            queryClient.setQueryData<Task[]>(tasksKey, (old) => {
              if (!old) return old;
              return old.map((t) => (t.id === moved.id ? moved : t));
            });
            break;
          }
          case "task.updated": {
            const updated = msg.payload as unknown as Task;
            queryClient.setQueryData<Task[]>(tasksKey, (old) => {
              if (!old) return old;
              return old.map((t) => (t.id === updated.id ? updated : t));
            });
            break;
          }
          case "task.created": {
            const created = msg.payload as unknown as Task;
            queryClient.setQueryData<Task[]>(tasksKey, (old) => {
              if (!old) return [created];
              return [...old, created];
            });
            break;
          }
          case "task.deleted": {
            const deletedId = (msg.payload as { task_id: number }).task_id;
            queryClient.setQueryData<Task[]>(tasksKey, (old) => {
              if (!old) return old;
              return old.filter((t) => t.id !== deletedId);
            });
            break;
          }
          case "comment.created": {
            const comment = msg.payload as unknown as TaskComment;
            queryClient.invalidateQueries({ queryKey: ["tasks", comment.task_id] });
            break;
          }
          case "column.created":
          case "column.updated":
          case "column.deleted":
          case "column.reordered": {
            queryClient.invalidateQueries({ queryKey: columnsKey });
            break;
          }
        }
      };

      ws.onclose = () => {
        const backoff = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, backoff);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [projectId, queryClient]);

  return {
    columns: columnsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    isLoading: columnsQuery.isLoading || tasksQuery.isLoading,
    isError: columnsQuery.isError || tasksQuery.isError,
    error: columnsQuery.error ?? tasksQuery.error,
  };
}
