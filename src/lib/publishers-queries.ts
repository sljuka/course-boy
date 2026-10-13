import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

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

// How the app names a publisher: "Ana (4y9dgb89…)" with a name (the label
// you gave them in Publishers, else the Publisher name a course of theirs
// carries: `courseName`, or the one Publishers knows), "4y9dgb89…" without.
// The id is always there: a name proves nothing.
export function usePublisherDisplay(): (publisherId: string, courseName?: string | null) => string {
  const { t } = useTranslation();
  const { data: publishers } = usePublishersQuery();
  return useCallback(
    (publisherId: string, courseName?: string | null) => {
      const known = publishers?.find((candidate) => candidate.publisherId === publisherId);
      const name = known?.label ?? courseName ?? known?.claimedName;
      const id = shortPublisherId(publisherId);
      return name ? t("publishers.nameWithId", { id, name }) : t("publishers.shortId", { id });
    },
    [publishers, t],
  );
}

// A publisher's name where the app lists people (maintainers, approvals).
export function usePublisherName(): (publisherId: string) => string {
  const display = usePublisherDisplay();
  return useCallback((publisherId: string) => display(publisherId), [display]);
}
