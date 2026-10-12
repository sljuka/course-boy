// Publishers (SLJ-108): the address book of Publisher IDs, as the renderer
// sees it. Main keeps it per profile (electron/publishers.ts).

// Why a publisher is in the address book.
export type PublisherSource =
  // Added by hand in Publishers or when inviting.
  | { addedAt: string; kind: "manual" }
  // Published a course or program this profile imported (as the course claims).
  | { id: string; kind: "course" | "program"; title: string }
  // Maintains a course together with this profile.
  | { id: string; kind: "maintainer"; title: string };

export type PublisherEntry = {
  // The name their courses carry (their Publisher name), if any: only a
  // claim, so always shown with the Publisher ID.
  claimedName: string | null;
  // What the teacher called them, if anything.
  label: string | null;
  publisherId: string;
  sources: PublisherSource[];
};

// Longest Publisher name kept (and longest label), in characters.
export const MAX_PUBLISHER_NAME_LENGTH = 80;

// A Publisher name as kept and shown: one line, no control characters, at
// most MAX_PUBLISHER_NAME_LENGTH characters; "" for none. Used for the
// teacher's own (Settings) and for one read from a course.
export function normalizePublisherName(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const oneLine = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return [...oneLine].slice(0, MAX_PUBLISHER_NAME_LENGTH).join("").trim();
}
