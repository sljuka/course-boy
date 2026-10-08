import { useMutation, useQuery } from "@tanstack/react-query";

import type { Locale } from "@/lib/i18n";
import type { ProgramManifest, ProgramSummary } from "@/lib/program-package";
import { queryClient } from "@/lib/query-client";

// Programs (SLJ-32): the list, one program, and the curator's edits.

export function useProgramsQuery(locale: Locale) {
  return useQuery<ProgramSummary[]>({
    queryKey: ["programs", "list", locale],
    queryFn: () => window.programs.list(locale),
  });
}

export function useProgramQuery(programId: string | undefined) {
  return useQuery<ProgramManifest>({
    enabled: Boolean(programId),
    queryKey: ["programs", "detail", programId],
    queryFn: () => window.programs.get(programId!),
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

// A program's logo or banner, served by the main process.
export function programAssetUrl(programId: string, filename: string): string {
  return `matko-asset://program-${programId}/${encodeURIComponent(filename)}`;
}
