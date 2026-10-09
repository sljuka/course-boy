import { useMutation, useQuery } from "@tanstack/react-query";

import type { ApprovalItem, MaintainersInfo, ProposalReview } from "@/lib/maintainers";
import { queryClient } from "@/lib/query-client";

// Courses maintained by several publishers (SLJ-11). Polled: invites
// answered, approvals and new versions arrive from other computers.

export function useMaintainersQuery(courseId: string | undefined) {
  return useQuery<MaintainersInfo | null>({
    enabled: Boolean(courseId),
    queryKey: ["maintainers", "course", courseId],
    queryFn: () => window.maintainers.get(courseId!),
    refetchInterval: 5_000,
    staleTime: 0,
  });
}

export function useApprovalsQuery() {
  return useQuery<ApprovalItem[]>({
    queryKey: ["maintainers", "approvals"],
    queryFn: () => window.maintainers.listApprovals(),
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

export function useProposalReviewQuery(publicId: string | undefined, hash: string | undefined) {
  return useQuery<ProposalReview>({
    enabled: Boolean(publicId && hash),
    queryKey: ["maintainers", "review", publicId, hash],
    queryFn: () => window.maintainers.review({ hash: hash!, publicId: publicId! }),
    retry: false,
  });
}

const refreshMaintainers = () => queryClient.invalidateQueries({ queryKey: ["maintainers"] });

// Defined once, not per render (see program-queries.ts).
const invite = (courseId: string) => window.maintainers.invite(courseId);
const accept = (code: string) => window.maintainers.accept(code);
const startSharing = (input: { courseId: string; quorum: number }) => window.maintainers.startSharing(input);
const approve = (input: { hash: string; publicId: string }) => window.maintainers.approve(input);
const requestChanges = (input: { hash: string; note: string; publicId: string }) =>
  window.maintainers.requestChanges(input);

export function useInviteMaintainerMutation() {
  return useMutation<{ code: string }, Error, string>({ mutationFn: invite, onSuccess: refreshMaintainers });
}

export function useAcceptMaintainerInviteMutation() {
  return useMutation<{ publicId: string }, Error, string>({ mutationFn: accept, onSuccess: refreshMaintainers });
}

export function useStartSharingMutation() {
  return useMutation<void, Error, { courseId: string; quorum: number }>({
    mutationFn: startSharing,
    onSuccess: refreshMaintainers,
  });
}

export function useApproveMutation() {
  return useMutation<void, Error, { hash: string; publicId: string }>({ mutationFn: approve, onSuccess: refreshMaintainers });
}

export function useRequestChangesMutation() {
  return useMutation<void, Error, { hash: string; note: string; publicId: string }>({
    mutationFn: requestChanges,
    onSuccess: refreshMaintainers,
  });
}

// The rules a course with `count` maintainers can have: more than half, so
// two different versions can never both be approved.
export function quorumChoices(count: number): number[] {
  const choices: number[] = [];
  for (let quorum = Math.floor(count / 2) + 1; quorum <= count; quorum++) choices.push(quorum);
  return choices;
}

// A publisher id, short enough to show until publisher profiles (SLJ-31)
// give people names.
export function shortPublisherId(publisherId: string): string {
  return publisherId.slice(0, 8);
}

// This profile's publisher id (empty while there's no identity), to tell
// "you" apart in a course's maintainers.
export function useOwnPublisherIdQuery() {
  return useQuery<string>({
    queryKey: ["maintainers", "self"],
    queryFn: () => window.sharing.getCreatorKey(),
    staleTime: 60_000,
  });
}
