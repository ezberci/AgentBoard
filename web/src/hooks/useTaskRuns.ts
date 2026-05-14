import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useTaskRuns(taskId: number | null) {
  return useQuery({
    queryKey: ["tasks", taskId, "runs"],
    queryFn: () => api.getTaskRuns(taskId!),
    enabled: taskId !== null,
  });
}
