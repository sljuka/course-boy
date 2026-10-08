import { resolveAssetFilename } from "./course-asset-id";
import { isValidCourseId } from "./course-id";
import { isLocale, type Locale } from "./i18n";

// A program (SLJ-32): an ordered set of courses shared under one code, with
// its own title, description, logo, banner and colors. A program only
// references courses (by their share code); it never contains or changes
// them, so course packages are untouched.
//
// On disk, per profile (electron/program-paths.ts):
//
//   programs/<program-id>/program.json
//   programs/<program-id>/assets/<filename>   logo, banner (content-addressed)
//
// No versions and no draft: a program is its latest list. Publishing (phase 2)
// puts its current state online, and students' copies update on their own.
// See docs/contracts.md §5.

export const PROGRAM_FORMAT_VERSION = 1;

export type LocalizedProgramMetadata = {
  description: string;
  title: string;
};

// What the program shows for a course before it's imported (and keeps if
// nobody sharing the course is online): its titles and descriptions as they
// were when the curator added it or last published the program.
export type ProgramCourseSnapshot = {
  locales: Partial<Record<Locale, LocalizedProgramMetadata>>;
  publisherId: string | null;
  supportedLocales: Locale[];
  version: string | null;
};

export type ProgramCourse = {
  // The course's share code (its drive key): what a student imports. Null
  // for a course of your own not published yet (phase 1, local programs).
  code: string | null;
  courseId: string;
  snapshot: ProgramCourseSnapshot;
};

// A program's theme: one palette, applied app-wide on its page and in its
// courses (src/lib/program-theme.ts), whatever the reader's light or dark
// mode. Named after the app's own color variables. Three are required, so a
// theme always hangs together; any other left out is derived from them.
export const PROGRAM_THEME_COLORS = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type ProgramThemeColor = (typeof PROGRAM_THEME_COLORS)[number];

export const REQUIRED_PROGRAM_THEME_COLORS = ["background", "foreground", "primary"] as const;

export type ProgramTheme = Record<(typeof REQUIRED_PROGRAM_THEME_COLORS)[number], string> &
  Partial<Record<ProgramThemeColor, string>>;

export type ProgramManifest = {
  courses: ProgramCourse[];
  defaultLocale: Locale;
  formatVersion: typeof PROGRAM_FORMAT_VERSION;
  id: string;
  locales: Partial<Record<Locale, LocalizedProgramMetadata>>;
  // Asset filenames in the program's assets/, or null for the defaults.
  banner: string | null;
  logo: string | null;
  supportedLocales: Locale[];
  theme: ProgramTheme | null;
  updatedAt: string;
};

// A program as the app lists it: its manifest in the reader's language.
export type ProgramSummary = {
  courseCount: number;
  description: string;
  distribution: "imported" | "local";
  id: string;
  title: string;
  updatedAt: string;
};

export const isValidProgramId = isValidCourseId;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_COURSES = 200;

function isLocalizedMetadata(value: unknown): value is LocalizedProgramMetadata {
  const metadata = value as Partial<LocalizedProgramMetadata> | null;
  return (
    Boolean(metadata) &&
    typeof metadata?.title === "string" &&
    metadata.title.length <= MAX_TITLE_LENGTH &&
    typeof metadata.description === "string" &&
    metadata.description.length <= MAX_DESCRIPTION_LENGTH
  );
}

function isLocalesMap(value: unknown): value is Partial<Record<Locale, LocalizedProgramMetadata>> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value as object).every(([locale, metadata]) => isLocale(locale) && isLocalizedMetadata(metadata))
  );
}

function isLocaleList(value: unknown): value is Locale[] {
  return Array.isArray(value) && value.length > 0 && value.every(isLocale) && new Set(value).size === value.length;
}

function isAssetReference(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && resolveAssetFilename(value) !== null);
}

function isProgramCourse(value: unknown): value is ProgramCourse {
  const course = value as Partial<ProgramCourse> | null;
  const snapshot = course?.snapshot as Partial<ProgramCourseSnapshot> | undefined;
  return (
    Boolean(course) &&
    (course?.code === null || (typeof course?.code === "string" && /^[a-z0-9]{52,64}$/i.test(course.code))) &&
    isValidCourseId(course?.courseId) &&
    Boolean(snapshot) &&
    isLocalesMap(snapshot?.locales) &&
    isLocaleList(snapshot?.supportedLocales) &&
    (snapshot?.publisherId === null || typeof snapshot?.publisherId === "string") &&
    (snapshot?.version === null || typeof snapshot?.version === "string")
  );
}

const THEME_COLOR_SET = new Set<string>(PROGRAM_THEME_COLORS);

export function isProgramTheme(value: unknown): value is ProgramTheme {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as object);
  return (
    entries.every(([name, color]) => THEME_COLOR_SET.has(name) && isHexColor(color)) &&
    REQUIRED_PROGRAM_THEME_COLORS.every((name) => name in (value as object))
  );
}

// `program.json` from disk (and in phase 2 from other people's computers):
// every field checked, so a damaged or hostile file is refused rather than
// half-shown.
export function isProgramManifest(value: unknown): value is ProgramManifest {
  const manifest = value as Partial<ProgramManifest> | null;
  if (!manifest || typeof manifest !== "object") return false;

  return (
    manifest.formatVersion === PROGRAM_FORMAT_VERSION &&
    isValidProgramId(manifest.id) &&
    isLocale(manifest.defaultLocale) &&
    isLocaleList(manifest.supportedLocales) &&
    manifest.supportedLocales.includes(manifest.defaultLocale) &&
    isLocalesMap(manifest.locales) &&
    Boolean(manifest.locales[manifest.defaultLocale]) &&
    isAssetReference(manifest.logo) &&
    isAssetReference(manifest.banner) &&
    (manifest.theme === null || isProgramTheme(manifest.theme)) &&
    Array.isArray(manifest.courses) &&
    manifest.courses.length <= MAX_COURSES &&
    manifest.courses.every(isProgramCourse) &&
    new Set(manifest.courses.map((course) => course.courseId)).size === manifest.courses.length &&
    typeof manifest.updatedAt === "string"
  );
}

// A program written with a newer Matko: told apart from a damaged file, so
// the app can say "needs a newer version".
export function isNewerProgramFormat(value: unknown): boolean {
  const version = (value as { formatVersion?: unknown } | null)?.formatVersion;
  return typeof version === "number" && version > PROGRAM_FORMAT_VERSION;
}

// The program's title and description in the reader's language, then its
// default one.
export function localizeProgram(
  manifest: Pick<ProgramManifest, "defaultLocale" | "locales">,
  locale: Locale,
): LocalizedProgramMetadata {
  const written = (candidate: LocalizedProgramMetadata | undefined) =>
    candidate && candidate.title.trim().length > 0 ? candidate : undefined;
  return (
    written(manifest.locales[locale]) ??
    written(manifest.locales[manifest.defaultLocale]) ?? { description: "", title: "" }
  );
}
