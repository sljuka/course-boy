export type CourseTagColor =
  | "amber"
  | "emerald"
  | "rose"
  | "sky"
  | "stone"
  | "teal";

export type CourseTagDefinition = {
  color: CourseTagColor;
  id: string;
  label: string;
};

const courseTagColorOptions: CourseTagColor[] = [
  "amber",
  "sky",
  "emerald",
  "teal",
  "rose",
  "stone",
];

function isCourseTagColor(value: unknown): value is CourseTagColor {
  return typeof value === "string" && courseTagColorOptions.includes(value as CourseTagColor);
}

function normalizeCourseTagLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function slugifyCourseTagLabel(value: string) {
  return normalizeCourseTagLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureUniqueCourseTagId(
  baseId: string,
  tags: CourseTagDefinition[],
  excludedTagId?: string,
) {
  const normalizedBaseId = baseId || "tag";
  let nextId = normalizedBaseId;
  let suffix = 2;

  while (
    tags.some((tag) => tag.id === nextId && tag.id !== excludedTagId)
  ) {
    nextId = `${normalizedBaseId}-${suffix}`;
    suffix += 1;
  }

  return nextId;
}

function createCourseTagDefinition(
  label: string,
  color: CourseTagColor,
  existingTags: CourseTagDefinition[],
) {
  const normalizedLabel = normalizeCourseTagLabel(label);

  return {
    color,
    id: ensureUniqueCourseTagId(
      slugifyCourseTagLabel(normalizedLabel),
      existingTags,
    ),
    label: normalizedLabel,
  } satisfies CourseTagDefinition;
}

export {
  courseTagColorOptions,
  createCourseTagDefinition,
  ensureUniqueCourseTagId,
  isCourseTagColor,
  normalizeCourseTagLabel,
  slugifyCourseTagLabel,
};
