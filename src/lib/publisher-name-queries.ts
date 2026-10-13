import { normalizePublisherName } from "@/lib/publishers";
import { queryClient } from "@/lib/query-client";

const queryKey = ["preferences", "publisher-name"];

// The name given at the identity setup (SLJ-115): their channel (SLJ-31) starts
// with it. "" for none.
export async function savePublisherName(name: string): Promise<void> {
  const normalized = normalizePublisherName(name);
  await window.preferences.set({ publisherName: normalized });
  queryClient.setQueryData(queryKey, normalized);
}
