import { useMutation, useQuery } from "@tanstack/react-query";

import type { ApprovalsList, MaintainersInfo, ProposalReview } from "@/lib/maintainers";
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
  return useQuery<ApprovalsList>({
    queryKey: ["maintainers", "approvals"],
    queryFn: () => window.maintainers.listApprovals(),
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

// Only for someone else's proposal still waiting (`enabled`): a decided one's
// drive may be gone, and ours is open in the worker as our own.
export function useProposalReviewQuery(publicId: string | undefined, hash: string | undefined, enabled = true) {
  return useQuery<ProposalReview>({
    enabled: Boolean(publicId && hash) && enabled,
    queryKey: ["maintainers", "review", publicId, hash],
    queryFn: () => window.maintainers.review({ hash: hash!, publicId: publicId! }),
    retry: false,
  });
}

const refreshMaintainers = () => queryClient.invalidateQueries({ queryKey: ["maintainers"] });

// Defined once, not per render (see program-queries.ts).
const invite = (input: { courseId: string; publisherId: string }) => window.maintainers.invite(input);
const accept = (code: string) => window.maintainers.accept(code);
const startSharing = (input: { courseId: string; quorum: number }) => window.maintainers.startSharing(input);
const proposeChange = (input: { courseId: string; publisherIds: string[]; quorum: number }) =>
  window.maintainers.proposeChange(input);
const approve = (input: { hash: string; publicId: string }) => window.maintainers.approve(input);
const previewProposal = (input: { hash: string; publicId: string }) => window.maintainers.preview(input);
const withdraw = (input: { hash: string; publicId: string }) => window.maintainers.withdraw(input);
const requestChanges = (input: { hash: string; note: string; publicId: string }) =>
  window.maintainers.requestChanges(input);

export function useInviteMaintainerMutation() {
  return useMutation<{ code: string }, Error, { courseId: string; publisherId: string }>({
    mutationFn: invite,
    onSuccess: refreshMaintainers,
  });
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

// SLJ-70: asks to change who maintains a shared course, or the rule.
export function useProposeChangeMutation() {
  return useMutation<void, Error, { courseId: string; publisherIds: string[]; quorum: number }>({
    mutationFn: proposeChange,
    onSuccess: refreshMaintainers,
  });
}

export function useApproveMutation() {
  return useMutation<void, Error, { hash: string; publicId: string }>({ mutationFn: approve, onSuccess: refreshMaintainers });
}

// SLJ-110: withdraws your own waiting version.
export function useWithdrawProposalMutation() {
  return useMutation<void, Error, { hash: string; publicId: string }>({ mutationFn: withdraw, onSuccess: refreshMaintainers });
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

// "Preview as student" (SLJ-67): the proposed version's files downloaded for
// a look; returns the id its course page opens under.
export function usePreviewProposalMutation() {
  return useMutation<{ courseId: string }, Error, { hash: string; publicId: string }>({ mutationFn: previewProposal });
}
