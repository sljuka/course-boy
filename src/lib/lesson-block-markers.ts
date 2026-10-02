// Relative, not `@/`: the main process imports this through `serbian-script.ts`.
import type { EditorPrototypeBlockType } from "../components/editor-prototype/editor-prototype-types";

// A lesson body (`locales/<lang>/lesson-….md`) is a sequence of blocks, each
// introduced by a `[matko-block]: <> (type)` line (a CommonMark link-reference
// definition, so other markdown tools render nothing for it). See "Lesson block
// markers" in docs/contracts.md.
//
// The pattern accepts *any* type name, not just the ones this app version
// knows: a lesson written by a newer version must still split into its blocks
// here, so the unknown ones can be kept as-is instead of swallowing the lesson.
export const BLOCK_MARKER_PATTERN = /^\[matko-block\]: <> \(([A-Za-z0-9_-]+)\)$/;

export type KnownBlockType = Exclude<EditorPrototypeBlockType, "unknown">;

// Every block type this version can read and write. A `Record` over the union
// rather than a list, so adding a block type without listing it here is a
// compile error.
const KNOWN_BLOCK_TYPES: Record<KnownBlockType, true> = {
  audio: true,
  exercise: true,
  heading: true,
  image: true,
  markdown: true,
  video: true,
};

export function isKnownBlockType(type: string): type is KnownBlockType {
  return Object.prototype.hasOwnProperty.call(KNOWN_BLOCK_TYPES, type);
}

export function blockMarker(type: string): string {
  return `[matko-block]: <> (${type})`;
}
