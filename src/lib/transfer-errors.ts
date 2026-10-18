import type { TFunction } from "i18next";

// Why a download failed, in the student's language (SLJ-153). The worker
// starts its refusals' messages with a code (workers/download-limits.cjs):
// Electron's IPC passes on only an error's message, wrapped in
// "Error invoking remote method '…': Error: …". A known code becomes its
// sentence; anything else is shown as it is, without that wrapping.
const TRANSFER_ERROR_CODES = ["COURSE_TOO_BIG", "TOO_MANY_FILES", "NOT_ENOUGH_SPACE", "NOT_MATKO"] as const;

export type TransferErrorCode = (typeof TRANSFER_ERROR_CODES)[number];

export function transferErrorCode(error: Error): TransferErrorCode | null {
  return TRANSFER_ERROR_CODES.find((code) => new RegExp(`\\b${code}:`).test(error.message)) ?? null;
}

export function transferErrorText(error: Error, t: TFunction): string {
  const code = transferErrorCode(error);
  if (code) return t(`transfer.errors.${code}`);
  return error.message.replace(/^Error invoking remote method '[^']*': /, "").replace(/^Error: /, "");
}
