import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { McpStatus } from "@/lib/mcp";

// Agents (SLJ-68): the MCP server's state, its switch and its access code.
const statusKey = ["mcp", "status"];

export function useMcpStatusQuery() {
  return useQuery<McpStatus>({ queryKey: statusKey, queryFn: () => window.mcp.getStatus() });
}

export function useSetMcpEnabledMutation() {
  const client = useQueryClient();
  return useMutation<McpStatus, Error, boolean>({
    mutationFn: (enabled) => window.mcp.setEnabled(enabled),
    onSuccess: (status) => client.setQueryData(statusKey, status),
  });
}

export function useRegenerateMcpTokenMutation() {
  const client = useQueryClient();
  return useMutation<McpStatus, Error, void>({
    mutationFn: () => window.mcp.regenerateToken(),
    onSuccess: (status) => client.setQueryData(statusKey, status),
  });
}

// An agent changed courses or programs: read them again, so the open page
// (the course editor, My courses) shows it.
export function useRefreshOnAgentChanges() {
  const client = useQueryClient();
  useEffect(
    () =>
      window.mcp.onChanged(() => {
        void client.invalidateQueries({ queryKey: ["courses"] });
        void client.invalidateQueries({ queryKey: ["programs"] });
      }),
    [client],
  );
}
