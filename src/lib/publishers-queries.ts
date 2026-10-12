import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { shortPublisherId } from "@/lib/maintainers-queries";
import type { PublisherEntry } from "@/lib/publishers";
import { queryClient } from "@/lib/query-client";
import { useAppState } from "@/lib/use-app-state";

// Publishers (SLJ-108): the profile's address book of Publisher IDs.

export function usePublishersQuery() {
  const { locale } = useAppState();
  return useQuery<PublisherEntry[]>({
    queryKey: ["publishers", locale],
    queryFn: () => window.publishers.list(locale),
    staleTime: 0,
  });
}

const refreshPublishers = () => queryClient.invalidateQueries({ queryKey: ["publishers"] });

// Defined once, not per render (see program-queries.ts).
const savePublisher = (input: { label: string | null; publisherId: string }) => window.publishers.save(input);
const removePublisher = (publisherId: string) => window.publishers.remove(publisherId);

export function useSavePublisherMutation() {
  return useMutation<void, Error, { label: string | null; publisherId: string }>({
    mutationFn: savePublisher,
    onSuccess: refreshPublishers,
  });
}

export function useRemovePublisherMutation() {
  return useMutation<void, Error, string>({ mutationFn: removePublisher, onSuccess: refreshPublishers });
}

// A publisher's name where the app shows one: their label in Publishers, else
// the short id.
export function usePublisherName(): (publisherId: string) => string {
  const { data: publishers } = usePublishersQuery();
  return useCallback(
    (publisherId: string) =>
      publishers?.find((entry) => entry.publisherId === publisherId)?.label ?? shortPublisherId(publisherId),
    [publishers],
  );
}
