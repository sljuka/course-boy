import type { Locale } from "@/lib/i18n";
import type { CourseAssetKind } from "@/lib/course-asset-id";
import type { CourseTagDefinition } from "@/lib/course-tags";
import type {
  CourseVersionInfo,
  CourseVersionReleaseType,
} from "@/lib/course-versioning";

export type CourseStatus = "draft" | "published";
export type ContentRating = "all-ages" | "mature-themes" | "explicit";
// "local": authored on this device (has a draft/ directory that can diverge
// from its last cut version — see CourseVersionBadge). "bundled": shipped
// with the app or brought in from elsewhere (the seeded tutorial today; a
// future peer import lands the same way) — read-only, always "at" its
// version, never a draft.
export type CourseDistribution = "local" | "bundled";

export type CourseManifest = {
  builtin: boolean;
  contentRating: ContentRating;
  defaultLocale: Locale;
  descriptiveTags?: CourseTagDefinition[];
  distribution: CourseDistribution;
  id: string;
  locales: Record<Locale, LocalizedCourseMetadata>;
  slug: string;
  status: CourseStatus;
  supportedLocales: Locale[];
  version: string;
  versionInfo?: CourseVersionInfo;
};

/**
 * Whether a personal (distribution: "local") course's current draft has
 * changes beyond its most recently cut version. Computed by comparing the
 * draft's file hashes against the latest `versions/<x.y.z>/` snapshot's
 * stored hashes — see `computeCourseVersionBadge` in
 * electron/course-registry.ts. A bundled course (no draft/ to diverge) is
 * always `{ kind: "version" }`.
 */
export type CourseVersionBadge =
  | { kind: "draft" }
  | { kind: "version"; version: string };

export type LocalizedCourseMetadata = {
  description: string;
  title: string;
};

export type LocalizedLessonMetadata = {
  description: string;
  title: string;
};

export type LocalizedSectionMetadata = {
  description?: string;
  title: string;
};

export type CourseExerciseVariable = {
  max: number;
  min: number;
  parity?: "even" | "odd";
  type: "integer";
};

export type CourseExerciseSolutionSpace = number | "sm" | "md" | "lg" | "xl";

export type ExerciseKind = "numeric" | "multiple-choice" | "word-types" | "missing-word";

export type NumericCourseExercise = {
  kind: "numeric";
  hint?: string;
  id: string;
  precision: number;
  prompt: string;
  solutionSpace: CourseExerciseSolutionSpace;
  tags: string[];
  variables: Record<string, CourseExerciseVariable>;
  formula: string;
};

export type MultipleChoiceCourseExercise = {
  kind: "multiple-choice";
  hint?: string;
  id: string;
  prompt: string;
  tags: string[];
  options: string[];
  correctOptionIndex: number;
};

export type WordTypeDefinition = {
  // A named `CourseTagColor` (from courses saved before the custom color
  // picker existed) or an arbitrary CSS color string (typically a hex
  // value) — see `isValidWordTypeColor` in `src/lib/exercise-kinds/word-types.ts`.
  color: string;
  icon: string;
  id: string;
  names: Partial<Record<Locale, string>>;
  symbol: string;
};

export type WordTypeToken =
  | { kind: "text"; value: string }
  | { kind: "word"; value: string; wordTypeId: string };

export type WordTypeCourseExercise = {
  kind: "word-types";
  hint?: string;
  id: string;
  prompt: string;
  tags: string[];
  tokens: WordTypeToken[];
  wordTypes: Array<{
    color: string;
    icon: string;
    id: string;
    name: string;
    symbol: string;
  }>;
};

export type MissingWordSegment =
  | { kind: "text"; value: string }
  | { kind: "blank"; variableName: string };

export type MissingWordVariable = {
  // Every accepted answer, already trimmed and non-empty.
  answers: string[];
  // Whether a student's answer must match the accepted answers' case exactly.
  matchCase: boolean;
  name: string;
};

export type MissingWordCourseExercise = {
  kind: "missing-word";
  hint?: string;
  id: string;
  prompt: string;
  segments: MissingWordSegment[];
  tags: string[];
  variables: MissingWordVariable[];
};

export type CourseExercise =
  | NumericCourseExercise
  | MultipleChoiceCourseExercise
  | WordTypeCourseExercise
  | MissingWordCourseExercise;

export type CourseTestStructureRule = {
  count: number;
  tag: string;
};

export type CourseTest = {
  exercises: CourseExercise[];
  id: string;
  structure?: CourseTestStructureRule[];
};

/**
 * On-disk shape of a `test-XX-slug.json` file — the canonical, all-locales
 * form. `readLessonTest` collapses this to a single-locale `CourseTest` for
 * the player; the draft editor needs this richer shape directly. A missing
 * `kind` (every test file written before multiple-choice existed) defaults to
 * `"numeric"` at read time — see `normalizeSharedTestExerciseDefinition`.
 */
export type SharedNumericTestExerciseDefinition = {
  kind: "numeric";
  locales: Partial<Record<Locale, { hint?: string; prompt: string }>>;
  solution: {
    formula: string;
    precision: number;
    space?: CourseExerciseSolutionSpace;
  };
  tags: string[];
  variables: Record<string, CourseExerciseVariable>;
};

export type SharedMultipleChoiceTestExerciseDefinition = {
  kind: "multiple-choice";
  locales: Partial<Record<Locale, { hint?: string; prompt: string; options: string[] }>>;
  correctOptionIndex: number;
  tags: string[];
};

export type SharedWordTypeTestExerciseDefinition = {
  kind: "word-types";
  locales: Partial<Record<Locale, { hint?: string; prompt: string; text: string }>>;
  tags: string[];
  wordTypes: WordTypeDefinition[];
};

export type SharedMissingWordTestExerciseDefinition = {
  kind: "missing-word";
  locales: Partial<
    Record<
      Locale,
      { hint?: string; prompt: string; text: string; variables: MissingWordVariable[] }
    >
  >;
  tags: string[];
};

export type SharedTestExerciseDefinition =
  | SharedNumericTestExerciseDefinition
  | SharedMultipleChoiceTestExerciseDefinition
  | SharedWordTypeTestExerciseDefinition
  | SharedMissingWordTestExerciseDefinition;

export type SharedTestDefinition = {
  exercises: SharedTestExerciseDefinition[];
  structure?: CourseTestStructureRule[];
  template: string;
};

export type LessonPreview = {
  description: string;
  id: string;
  iconUrl: string | null;
  title: string;
};

export type CoursePreviewItem = {
  iconUrl: string | null;
  id: string;
  kind: "lesson" | "test";
  title: string;
};

export type CourseLesson = LessonPreview & {
  body: string;
  test: CourseTest | null;
};

// A test that stands on its own as a section item — no parent lesson, no
// document. Distinct from `CourseLesson.test`, which is attached to (and
// whose file identity is derived from) a lesson. `test` is `null` until the
// author saves at least one exercise, mirroring `CourseLesson.test` — a
// standalone test's own file exists (holding its title) before its content
// does. See docs/contracts.md.
export type CourseSectionTest = LessonPreview & {
  test: CourseTest | null;
};

export type CourseSectionPreview = {
  description?: string;
  id: string;
  lessons: CourseLesson[];
  locales: Record<Locale, LocalizedSectionMetadata>;
  tests: CourseSectionTest[];
  title: string;
};

export type StoredSectionDefinition = {
  id: string;
  locales: Record<Locale, LocalizedSectionMetadata>;
  slug: string;
};

export type CourseSummary = {
  contentRating: ContentRating;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  description: string;
  distribution: CourseDistribution;
  id: string;
  lessonPreviews: LessonPreview[];
  previewItems: CoursePreviewItem[];
  status: CourseStatus;
  supportedLocales: Locale[];
  title: string;
  version: string;
  versionBadge: CourseVersionBadge;
};

export type CourseDetails = CourseSummary & {
  builtin: boolean;
  entrySectionId: string | null;
  lessonIds: string[];
  locales: Record<Locale, LocalizedCourseMetadata>;
  sections: CourseSectionPreview[];
  sectionIds: string[];
  slug: string;
};

export type CreateCourseDraftInput = {
  contentRating?: ContentRating;
  defaultLocale: Locale;
  deriveSrCyrlFromSr?: boolean;
  locales: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

export type CreateCourseDraftResult = {
  courseId: string;
};

export type CreateCourseSectionInput = {
  courseId: string;
  description?: string;
  title: string;
};

export type CreateCourseSectionResult = {
  sectionId: string;
};

export type CreateCourseLessonInput = {
  courseId: string;
  description?: string;
  sectionId: string;
  title: string;
};

export type CreateCourseLessonResult = {
  lessonId: string;
};

export type UpdateLessonContentInput = {
  courseId: string;
  lessonId: string;
  locales: Partial<Record<Locale, { body: string }>>;
  sectionId: string;
};

export type SaveLessonTestInput = {
  courseId: string;
  lessonId: string;
  sectionId: string;
  test: SharedTestDefinition;
};

export type GetLessonTestDraftInput = {
  courseId: string;
  lessonId: string;
  sectionId: string;
};

export type CreateCourseSectionTestInput = {
  courseId: string;
  sectionId: string;
  title: string;
};

export type CreateCourseSectionTestResult = {
  testId: string;
};

export type SaveSectionTestInput = {
  courseId: string;
  sectionId: string;
  test: SharedTestDefinition;
  testId: string;
};

export type GetSectionTestDraftInput = {
  courseId: string;
  sectionId: string;
  testId: string;
};

export type UpdateCourseDraftMetadataInput = {
  contentRating: ContentRating;
  courseId: string;
  defaultLocale: Locale;
  descriptiveTags: CourseTagDefinition[];
  locales: Partial<Record<Locale, LocalizedCourseMetadata>>;
  supportedLocales: Locale[];
};

export type UploadCourseAssetInput = {
  courseId: string;
  kind: CourseAssetKind;
};

export type UploadCourseAssetResult = {
  mimeType: string;
  path: string;
} | null;

export type CutCourseVersionInput = {
  courseId: string;
  releaseType: Exclude<CourseVersionReleaseType, "initial">;
};

export type CutCourseVersionResult = {
  version: string;
};

export type RevertCourseDraftInput = {
  courseId: string;
  version: string;
};

export type PublishCourseVersionInput = {
  courseId: string;
  version: string;
};

export type CourseVersionHistoryEntry = {
  cutAt: string;
  isCurrentlyPublished: boolean;
  isEverPublished: boolean;
  releaseType: CourseVersionReleaseType;
  version: string;
};

export type CourseVersionHistory = {
  currentDraftVersion: string;
  publishedVersion: string | null;
  versions: CourseVersionHistoryEntry[];
};
