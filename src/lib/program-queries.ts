import { useMutation, useQuery } from "@tanstack/react-query";

import type { Locale } from "@/lib/i18n";
import type { PeekCourseResult, ProgramManifest, ProgramSharingInfo, ProgramSummary } from "@/lib/program-package";
import { queryClient } from "@/lib/query-client";

// Programs (SLJ-32): the list, one program, and the curator's edits.

export function useProgramsQuery(locale: Locale) {
  return useQuery<ProgramSummary[]>({
    queryKey: ["programs", "list", locale],
    queryFn: () => window.programs.list(locale),
    // Imported programs change on their own (their publisher's latest).
    refetchInterval: 30_000,
  });
}

export function useProgramQuery(programId: string | undefined) {
  return useQuery<ProgramManifest>({
    enabled: Boolean(programId),
    queryKey: ["programs", "detail", programId],
    queryFn: () => window.programs.get(programId!),
    // An imported program changes on its own: read fresh on arrival.
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

const refreshPrograms = () => queryClient.invalidateQueries({ queryKey: ["programs"] });

export function useCreateProgramMutation() {
  return useMutation<{ programId: string }, Error, { locale: Locale; title: string }>({
    mutationFn: (input) => window.programs.create(input),
    onSuccess: refreshPrograms,
  });
}

// Defined once, not per render: a mutation's options changing on every
// render makes TanStack notify the whole mutation cache each time.
const updateProgram = (manifest: ProgramManifest) => window.programs.update(manifest);

export function useUpdateProgramMutation() {
  return useMutation<void, Error, ProgramManifest>({
    mutationFn: updateProgram,
    // The program's page (Preview) shows what was just saved, and the list
    // (titles, counts) follows. The open editor keeps its own copy.
    onSuccess: async (_result, manifest) => {
      queryClient.setQueryData(["programs", "detail", manifest.id], manifest);
      await queryClient.invalidateQueries({ queryKey: ["programs", "list"] });
    },
  });
}

export function useRemoveProgramMutation() {
  return useMutation<void, Error, string>({
    mutationFn: (programId) => window.programs.remove(programId),
    onSuccess: refreshPrograms,
  });
}

// A program online (SLJ-32 phase 2): its code and peers. Peers are polled
// while a code is on screen.
export function useProgramSharingQuery(programId: string | undefined, { watchPeers = false } = {}) {
  return useQuery<ProgramSharingInfo>({
    enabled: Boolean(programId),
    queryKey: ["programs", "sharing", programId],
    queryFn: () => window.programs.getSharing(programId!),
    refetchInterval: watchPeers ? 5_000 : 30_000,
    // Read fresh on arrival: the program page takes its New courses from it.
    staleTime: 0,
  });
}

const publishProgram = (programId: string) => window.programs.publish(programId);

export function usePublishProgramMutation() {
  return useMutation<{ code: string }, Error, string>({
    mutationFn: publishProgram,
    onSuccess: (_result, programId) => queryClient.invalidateQueries({ queryKey: ["programs", "sharing", programId] }),
  });
}

const peekCourse = (code: string) => window.programs.peekCourse(code);

// Another publisher's course by its code, fetched from the network to add to
// a program (its titles and description become the program's snapshot).
export function usePeekCourseMutation() {
  return useMutation<PeekCourseResult, Error, string>({ mutationFn: peekCourse });
}

// A program's logo or banner, served by the main process.
export function programAssetUrl(programId: string, filename: string): string {
  return `matko-asset://program-${programId}/${encodeURIComponent(filename)}`;
}
