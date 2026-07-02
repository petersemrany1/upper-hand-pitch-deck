import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getErrorLogs,
  getUnresolvedCount,
  resolveErrorLog,
} from "@/utils/error-logger.functions";
import { keys } from "./keys";

export function useErrorLogs() {
  return useQuery({
    queryKey: keys.errorLogs.list(),
    queryFn: () => getErrorLogs(),
  });
}

export function useUnresolvedErrorCount() {
  return useQuery({
    queryKey: keys.errorLogs.unresolvedCount(),
    queryFn: () => getUnresolvedCount(),
    refetchInterval: 60_000,
  });
}

export function useResolveErrorLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveErrorLog({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.errorLogs.all }),
  });
}
