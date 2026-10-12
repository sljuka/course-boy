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
  // What the teacher called them, if anything.
  label: string | null;
  publisherId: string;
  sources: PublisherSource[];
};
