import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useBoard(projectId: number | null) {
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

  return {
    columns: columnsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    isLoading: columnsQuery.isLoading || tasksQuery.isLoading,
    isError: columnsQuery.isError || tasksQuery.isError,
    error: columnsQuery.error ?? tasksQuery.error,
  };
}
