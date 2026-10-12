import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { normalizePublisherName } from "@/lib/publishers";
import { queryClient } from "@/lib/query-client";

const queryKey = ["preferences", "publisher-name"];

// The teacher's Publisher name: carried by the courses and programs they
// publish, shown to students next to their Publisher ID. "" for none.
export function usePublisherNamePreference(): [string, (name: string) => Promise<void>] {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await window.preferences.get()).publisherName ?? "",
  });

  const setName = useCallback(
    async (name: string) => {
      const normalized = normalizePublisherName(name);
      client.setQueryData(queryKey, normalized);
      await savePublisherName(normalized);
    },
    [client],
  );

  return [data ?? "", setName];
}

// Also used by the identity setup, before its first Publish.
export async function savePublisherName(name: string): Promise<void> {
  const normalized = normalizePublisherName(name);
  await window.preferences.set({ publisherName: normalized });
  queryClient.setQueryData(queryKey, normalized);
}
