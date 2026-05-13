import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Task, TaskComment } from "@/types";

export function useTaskDetail(id: number | null) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.getTask(id!),
    enabled: id !== null,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof api.updateTask>[1] }) =>
      api.updateTask(id, payload),
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.id] });
      queryClient.invalidateQueries({ queryKey: ["projects", data.project_id, "tasks"] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: { author: string; body: string } }) =>
      api.addComment(taskId, payload),
    onSuccess: (data: TaskComment) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.task_id] });
    },
  });
}
