import fs from "node:fs/promises";
import path from "node:path";

import type {
  ContentRating,
  CourseTest,
  CourseDistribution,
  CourseLesson,
  CourseSectionPreview,
  CourseSectionTest,
  CourseDetails,
  CourseManifest,
  CoursePreviewItem,
  CourseSummary,
  CourseStatus,
  CourseVersionBadge,
  CourseVersionHistory,
  CourseVersionHistoryEntry,
  LessonPreview,
  LocalizedCourseMetadata,
  LocalizedLessonMetadata,
  LocalizedSectionMetadata,
  SharedTestDefinition,
  StoredSectionDefinition,
} from "../src/lib/course-package";
import { resolveTestIdForLesson } from "../src/lib/course-test-id";
import { isLocale, type Locale } from "../src/lib/i18n";
import {
  compareCourseVersions,
  formatCourseVersion,
  parseCourseVersion,
  type CourseVersionInfo,
  type CourseVersionReleaseType,
} from "../src/lib/course-versioning";
import {
  findMostRecentSnapshot,
  hashFileContents,
  listFilesRecursively,
} from "./course-paths";
import {
  getExerciseKindRuntime,
  normalizeExerciseKind,
  resolveSharedTestForPlayer,
} from "../src/lib/exercise-kinds/registry";

type CourseRecord = {
  courseRootPath: string;
  manifest: CourseManifest;
  packageDirectoryPath: string;
};

type RawCourseManifest = Omit<CourseManifest, "distribution" | "status"> & {
  contentRating?: ContentRating;
  distribution?: CourseDistribution;
  status?: CourseStatus;
};

type SharedLessonDefinition = {
  id: string;
  icon?: string;
  locales: Record<Locale, LocalizedLessonMetadata>;
  slug: string;
  template?: string;
};

type SharedSectionDefinition = {
  id: string;
  locales: Record<Locale, LocalizedSectionMetadata>;
  lessonIds: string[];
  testIds: string[];
  slug: string;
};

// The on-disk shape of a `section-test-XX-slug.json` file — a standalone
// test's own metadata (id/slug/locales, like a lesson's), independent of any
// lesson. Unlike a lesson/test pair, there's no document to justify splitting
// metadata from content, so the same file also carries `SharedTestDefinition`
// fields once the author saves at least one exercise — see
// `isStoredSectionTestDefinition` and `readCourseSectionTest`.
type StoredSectionTestDefinition = {
  id: string;
  locales: Record<Locale, LocalizedLessonMetadata>;
  slug: string;
};

const allowedIconExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const iconMimeTypes: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
const sectionDirectoryPattern = /^section-(\d{2})-[a-z0-9-]+$/;

function isCourseStatus(value: unknown): value is CourseStatus {
  return value === "draft" || value === "published";
}

function isCourseDistribution(value: unknown): value is CourseDistribution {
  return value === "local" || value === "bundled";
}

function isContentRating(value: unknown): value is ContentRating {
  return (
    value === "all-ages" ||
    value === "mature-themes" ||
    value === "explicit"
  );
}

function isCourseVersionReleaseType(
  value: unknown,
): value is CourseVersionInfo["releaseType"] {
  return (
    value === "initial" ||
    value === "major" ||
    value === "minor" ||
    value === "patch"
  );
}

function isCourseVersionInfo(value: unknown): value is CourseVersionInfo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const versionInfo = value as Partial<CourseVersionInfo>;

  return (
    typeof versionInfo.major === "number" &&
    Number.isInteger(versionInfo.major) &&
    versionInfo.major >= 0 &&
    typeof versionInfo.minor === "number" &&
    Number.isInteger(versionInfo.minor) &&
    versionInfo.minor >= 0 &&
    typeof versionInfo.patch === "number" &&
    Number.isInteger(versionInfo.patch) &&
    versionInfo.patch >= 0 &&
    isCourseVersionReleaseType(versionInfo.releaseType)
  );
}

function isRawCourseManifest(value: unknown): value is RawCourseManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<RawCourseManifest>;

  return (
    typeof manifest.id === "string" &&
    typeof manifest.version === "string" &&
    (typeof manifest.versionInfo === "undefined" ||
      isCourseVersionInfo(manifest.versionInfo)) &&
    typeof manifest.builtin === "boolean" &&
    (typeof manifest.contentRating === "undefined" ||
      isContentRating(manifest.contentRating)) &&
    typeof manifest.slug === "string" &&
    (typeof manifest.status === "undefined" || isCourseStatus(manifest.status)) &&
    (typeof manifest.distribution === "undefined" ||
      isCourseDistribution(manifest.distribution)) &&
    Boolean(manifest.locales) &&
    typeof manifest.locales === "object" &&
    Object.entries(manifest.locales).every(([locale, metadata]) => {
      return isLocale(locale) && isLocalizedCourseMetadata(metadata);
    }) &&
    isLocale(manifest.defaultLocale) &&
    Array.isArray(manifest.supportedLocales) &&
    manifest.supportedLocales.every(
      (locale) => isLocale(locale) && Boolean(manifest.locales?.[locale]),
    )
  );
}

function isLocalizedCourseMetadata(
  value: unknown,
): value is LocalizedCourseMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<LocalizedCourseMetadata>;

  return (
    typeof metadata.title === "string" &&
    typeof metadata.description === "string"
  );
}

function isLocalizedLessonMetadata(
  value: unknown,
): value is LocalizedLessonMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<LocalizedLessonMetadata>;

  return (
    typeof metadata.title === "string" &&
    typeof metadata.description === "string"
  );
}

function isLocalizedSectionMetadata(
  value: unknown,
): value is LocalizedSectionMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<LocalizedSectionMetadata>;

  return (
    typeof metadata.title === "string" &&
    (typeof metadata.description === "undefined" ||
      typeof metadata.description === "string")
  );
}

function isSharedLessonDefinition(
  value: unknown,
): value is SharedLessonDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const lesson = value as Partial<SharedLessonDefinition>;

  return (
    typeof lesson.id === "string" &&
    typeof lesson.slug === "string" &&
    Boolean(lesson.locales) &&
    typeof lesson.locales === "object" &&
    Object.entries(lesson.locales).every(([locale, metadata]) => {
      return isLocale(locale) && isLocalizedLessonMetadata(metadata);
    }) &&
    (typeof lesson.icon === "undefined" || typeof lesson.icon === "string") &&
    (typeof lesson.template === "undefined" || typeof lesson.template === "string")
  );
}

function isStoredSectionDefinition(
  value: unknown,
): value is StoredSectionDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const section = value as Partial<StoredSectionDefinition>;

  return (
    typeof section.id === "string" &&
    typeof section.slug === "string" &&
    Boolean(section.locales) &&
    typeof section.locales === "object" &&
    Object.entries(section.locales).every(([locale, metadata]) => {
      return isLocale(locale) && isLocalizedSectionMetadata(metadata);
    })
  );
}

function isStoredSectionTestDefinition(
  value: unknown,
): value is StoredSectionTestDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const test = value as Partial<StoredSectionTestDefinition>;

  return (
    typeof test.id === "string" &&
    typeof test.slug === "string" &&
    Boolean(test.locales) &&
    typeof test.locales === "object" &&
    Object.entries(test.locales).every(([locale, metadata]) => {
      return isLocale(locale) && isLocalizedLessonMetadata(metadata);
    })
  );
}

export function isSharedTestDefinition(
  value: unknown,
): value is SharedTestDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const test = value as Partial<SharedTestDefinition>;

  if (
    typeof test.template !== "string" ||
    !Array.isArray(test.exercises) ||
    test.exercises.length === 0
  ) {
    return false;
  }

  // Each kind's structural guard (and the "no `kind` field → numeric" legacy
  // default) lives with that kind in src/lib/exercise-kinds/ — see "Adding an
  // exercise kind" in docs/contracts.md.
  const exercisesAreValid = test.exercises.every((exercise) => {
    if (!exercise || typeof exercise !== "object") {
      return false;
    }

    const typedExercise = exercise as Record<string, unknown>;
    const kind = normalizeExerciseKind(typedExercise.kind);

    if (!kind) {
      return false;
    }

    return getExerciseKindRuntime(kind).isValid(typedExercise);
  });

  if (!exercisesAreValid) {
    return false;
  }

  if (typeof test.structure === "undefined") {
    return true;
  }

  // Whether enough exercises exist to fill a rule is a content-completeness
  // concern, not a structural one — buildTestExerciseSequence (src/lib/
  // course-player-utils.ts) already takes however many are available per
  // rule instead of failing, so an underfilled rule must not block saving.
  return (
    Array.isArray(test.structure) &&
    test.structure.every((rule) => {
      return (
        Boolean(rule) &&
        typeof rule === "object" &&
        typeof rule.tag === "string" &&
        typeof rule.count === "number" &&
        Number.isInteger(rule.count) &&
        rule.count > 0
      );
    })
  );
}

async function readJsonFile<T>(
  filePath: string,
  validator: (value: unknown) => value is T,
): Promise<T> {
  const fileContents = await fs.readFile(filePath, "utf8");
  const parsedValue = JSON.parse(fileContents) as unknown;

  if (!validator(parsedValue)) {
    throw new Error(`Invalid JSON structure in ${filePath}`);
  }

  return parsedValue;
}

function normalizeCourseManifest(manifest: RawCourseManifest): CourseManifest {
  const normalizedVersionInfo = manifest.versionInfo ?? parseCourseVersion(manifest.version);

  return {
    ...manifest,
    contentRating: manifest.contentRating ?? "all-ages",
    distribution: manifest.distribution ?? "local",
    status: manifest.status ?? "published",
    version: formatCourseVersion(normalizedVersionInfo),
    versionInfo: normalizedVersionInfo,
  };
}

export function resolvePackageDirectoryCandidates(courseRootPath: string): string[] {
  return [path.join(courseRootPath, "draft"), courseRootPath];
}

async function listCourseRecords(rootDirectoryPath: string): Promise<CourseRecord[]> {
  let directoryEntries;

  try {
    directoryEntries = await fs.readdir(rootDirectoryPath, {
      withFileTypes: true,
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const courseRecords = await Promise.all(
    directoryEntries
      .filter((directoryEntry) => directoryEntry.isDirectory())
      .map(async (directoryEntry) => {
        const courseRootPath = path.join(rootDirectoryPath, directoryEntry.name);
        const packageDirectoryCandidates = resolvePackageDirectoryCandidates(courseRootPath);

        for (const packageDirectoryPath of packageDirectoryCandidates) {
          const manifestPath = path.join(packageDirectoryPath, "course.json");

          try {
            const rawManifest = await readJsonFile(manifestPath, isRawCourseManifest);
            const manifest = normalizeCourseManifest(rawManifest);

            return {
              courseRootPath,
              manifest,
              packageDirectoryPath,
            } satisfies CourseRecord;
          } catch {
            continue;
          }
        }

        return null;
      }),
  );

  return courseRecords.filter(
    (courseRecord): courseRecord is CourseRecord => courseRecord !== null,
  );
}

async function readLocalizedCourseMetadata(
  courseRecord: CourseRecord,
  preferredLocale?: Locale,
): Promise<LocalizedCourseMetadata> {
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });

  for (const locale of requestedLocales) {
    const metadata = courseRecord.manifest.locales[locale];

    if (metadata) {
      return metadata;
    }
  }

  throw new Error(
    `Missing localized metadata for course "${courseRecord.manifest.id}"`,
  );
}

function resolveSectionDirectoryPath(
  courseRecord: CourseRecord,
  sectionId: string,
): string {
  return path.join(courseRecord.packageDirectoryPath, sectionId);
}

function resolveSectionLocaleDirectoryPath(
  courseRecord: CourseRecord,
  sectionId: string,
  locale: Locale,
): string {
  return path.join(resolveSectionDirectoryPath(courseRecord, sectionId), "locales", locale);
}

async function readSharedLessonDefinition(
  courseRecord: CourseRecord,
  sectionId: string,
  lessonId: string,
): Promise<SharedLessonDefinition> {
  return readJsonFile(
    path.join(resolveSectionDirectoryPath(courseRecord, sectionId), `${lessonId}.json`),
    isSharedLessonDefinition,
  );
}

async function readSharedSectionDefinition(
  courseRecord: CourseRecord,
  sectionId: string,
): Promise<SharedSectionDefinition> {
  const sectionDirectoryPath = resolveSectionDirectoryPath(courseRecord, sectionId);
  const storedSection = await readJsonFile(
    path.join(sectionDirectoryPath, "section.json"),
    isStoredSectionDefinition,
  );
  const directoryEntries = await fs.readdir(sectionDirectoryPath, {
    withFileTypes: true,
  });
  const lessonIds = directoryEntries
    .filter((entry) => entry.isFile() && /^lesson-\d{2}-.*\.json$/.test(entry.name))
    .map((entry) => entry.name.replace(/\.json$/, ""))
    .sort((leftLessonId, rightLessonId) => leftLessonId.localeCompare(rightLessonId, undefined, { numeric: true }));
  const testIds = directoryEntries
    .filter((entry) => entry.isFile() && /^section-test-\d{2}-.*\.json$/.test(entry.name))
    .map((entry) => entry.name.replace(/\.json$/, ""))
    .sort((leftTestId, rightTestId) => leftTestId.localeCompare(rightTestId, undefined, { numeric: true }));

  if (lessonIds.length === 0 && testIds.length === 0) {
    if (courseRecord.manifest.status === "draft") {
      return {
        ...storedSection,
        lessonIds: [],
        testIds: [],
      };
    }

    throw new Error(
      `Section "${sectionId}" does not contain any lesson-xx-* or section-test-xx-* files`,
    );
  }

  return {
    ...storedSection,
    lessonIds,
    testIds,
  };
}

async function readSharedTestDefinition(
  courseRecord: CourseRecord,
  sectionId: string,
  testId: string,
): Promise<SharedTestDefinition> {
  return readJsonFile(
    path.join(resolveSectionDirectoryPath(courseRecord, sectionId), `${testId}.json`),
    isSharedTestDefinition,
  );
}

async function readSharedSectionTestDefinition(
  courseRecord: CourseRecord,
  sectionId: string,
  testId: string,
): Promise<StoredSectionTestDefinition> {
  return readJsonFile(
    path.join(resolveSectionDirectoryPath(courseRecord, sectionId), `${testId}.json`),
    isStoredSectionTestDefinition,
  );
}

async function readCourseSectionTest(
  courseRecord: CourseRecord,
  sectionId: string,
  testId: string,
  preferredLocale?: Locale,
): Promise<CourseSectionTest> {
  const sharedSectionTest = await readSharedSectionTestDefinition(
    courseRecord,
    sectionId,
    testId,
  );
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });
  const matchedLocale = requestedLocales.find(
    (locale) => sharedSectionTest.locales[locale],
  );
  const preview: LessonPreview = matchedLocale
    ? {
        description: sharedSectionTest.locales[matchedLocale].description,
        id: testId,
        iconUrl: null,
        title: sharedSectionTest.locales[matchedLocale].title,
      }
    : {
        description: "",
        id: testId,
        iconUrl: null,
        title: sharedSectionTest.slug.replace(/-/g, " "),
      };

  // The same file carries both the standalone test's identity (validated
  // above) and its content once the author has saved at least one exercise —
  // `isSharedTestDefinition` only checks for the content fields, so it's safe
  // to probe the same already-read object a second time.
  const test = isSharedTestDefinition(sharedSectionTest)
    ? resolveSharedTestForPlayer(sharedSectionTest, requestedLocales, testId)
    : null;

  return { ...preview, test };
}

function resolveLocalizedLessonBodyPath(
  courseRecord: CourseRecord,
  sectionId: string,
  locale: Locale,
  lessonId: string,
): string {
  return path.join(
    resolveSectionLocaleDirectoryPath(courseRecord, sectionId, locale),
    `${lessonId}.md`,
  );
}

async function readLessonPreview(
  courseRecord: CourseRecord,
  sectionId: string,
  lessonId: string,
  preferredLocale?: Locale,
): Promise<LessonPreview> {
  const sharedLesson = await readSharedLessonDefinition(courseRecord, sectionId, lessonId);
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });

  for (const locale of requestedLocales) {
    const lessonMetadata = sharedLesson.locales[locale];
    if (lessonMetadata) {
      return {
        description: lessonMetadata.description,
        id: lessonId,
        iconUrl: await resolveLessonIconUrl(courseRecord, sharedLesson.icon),
        title: lessonMetadata.title,
      };
    }
  }

  return {
    description: "",
    id: lessonId,
    iconUrl: await resolveLessonIconUrl(courseRecord, sharedLesson.icon),
    title: sharedLesson.slug.replace(/-/g, " "),
  };
}

async function readLocalizedLessonBody(
  courseRecord: CourseRecord,
  sectionId: string,
  lessonId: string,
  preferredLocale?: Locale,
): Promise<string> {
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });

  for (const locale of requestedLocales) {
    try {
      return await fs.readFile(
        resolveLocalizedLessonBodyPath(courseRecord, sectionId, locale, lessonId),
        "utf8",
      );
    } catch {
      continue;
    }
  }

  return "";
}

async function readLessonTest(
  courseRecord: CourseRecord,
  sectionId: string,
  testId: string,
  preferredLocale?: Locale,
): Promise<CourseTest | null> {
  const sharedTest = await readSharedTestDefinition(courseRecord, sectionId, testId);
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });

  // `sharedTest` passed `isSharedTestDefinition` to get here, so every
  // exercise's kind is always resolvable — `resolveSharedTestForPlayer`
  // throwing here would mean that validation gate has a bug.
  return resolveSharedTestForPlayer(sharedTest, requestedLocales, testId);
}

async function readCourseLesson(
  courseRecord: CourseRecord,
  sectionId: string,
  lessonId: string,
  preferredLocale?: Locale,
): Promise<CourseLesson> {
  const preview = await readLessonPreview(courseRecord, sectionId, lessonId, preferredLocale);
  const testId = resolveTestIdForLesson(lessonId);
  const [body, test] = await Promise.all([
    readLocalizedLessonBody(courseRecord, sectionId, lessonId, preferredLocale),
    readLessonTest(courseRecord, sectionId, testId, preferredLocale).catch(() => null),
  ]);

  return {
    ...preview,
    body,
    test,
  };
}

async function resolveLessonIconUrl(
  courseRecord: CourseRecord,
  relativeIconPath?: string,
): Promise<string | null> {
  if (!relativeIconPath) {
    return null;
  }

  const normalizedIconPath = path.normalize(relativeIconPath);
  const resolvedIconPath = path.resolve(
    courseRecord.packageDirectoryPath,
    normalizedIconPath,
  );
  const relativeToCourseRoot = path.relative(
    courseRecord.packageDirectoryPath,
    resolvedIconPath,
  );

  if (
    relativeToCourseRoot.startsWith("..") ||
    path.isAbsolute(relativeToCourseRoot) ||
    !allowedIconExtensions.has(path.extname(resolvedIconPath).toLowerCase())
  ) {
    return null;
  }

  try {
    const extension = path.extname(resolvedIconPath).toLowerCase();
    const mimeType = iconMimeTypes[extension];

    if (!mimeType) {
      return null;
    }

    const fileContents = await fs.readFile(resolvedIconPath);
    return `data:${mimeType};base64,${fileContents.toString("base64")}`;
  } catch {
    return null;
  }
}

async function readLessonPreviews(
  courseRecord: CourseRecord,
  sections: SharedSectionDefinition[],
  preferredLocale?: Locale,
): Promise<LessonPreview[]> {
  return Promise.all(
    sections
      .flatMap((section) =>
        section.lessonIds.map((lessonId) => ({
          lessonId,
          sectionId: section.id,
        })),
      )
      .slice(0, 6)
      .map(({ lessonId, sectionId }) =>
        readLessonPreview(courseRecord, sectionId, lessonId, preferredLocale),
      ),
  );
}

async function hasLessonTest(
  courseRecord: CourseRecord,
  sectionId: string,
  lessonId: string,
): Promise<boolean> {
  const testId = resolveTestIdForLesson(lessonId);

  try {
    await fs.access(
      path.join(resolveSectionDirectoryPath(courseRecord, sectionId), `${testId}.json`),
    );
    return true;
  } catch {
    return false;
  }
}

async function readCoursePreviewItems(
  courseRecord: CourseRecord,
  sections: SharedSectionDefinition[],
  preferredLocale?: Locale,
): Promise<CoursePreviewItem[]> {
  const previewItems = await Promise.all([
    ...sections.flatMap((section) =>
      section.lessonIds.map(async (lessonId) => {
        const [lessonPreview, lessonHasTest] = await Promise.all([
          readLessonPreview(courseRecord, section.id, lessonId, preferredLocale),
          hasLessonTest(courseRecord, section.id, lessonId),
        ]);

        return [
          {
            ...lessonPreview,
            kind: "lesson" as const,
          },
          ...(lessonHasTest
            ? [
                {
                  iconUrl: null,
                  id: resolveTestIdForLesson(lessonId),
                  kind: "test" as const,
                  title: resolveTestIdForLesson(lessonId),
                },
              ]
            : []),
        ];
      }),
    ),
    ...sections.flatMap((section) =>
      section.testIds.map(async (testId) => {
        const sectionTest = await readCourseSectionTest(
          courseRecord,
          section.id,
          testId,
          preferredLocale,
        );

        return [
          {
            iconUrl: sectionTest.iconUrl,
            id: sectionTest.id,
            kind: "test" as const,
            title: sectionTest.title,
          },
        ];
      }),
    ),
  ]);

  return previewItems.flat().slice(0, 6);
}

function formatSectionTitle(sectionSlug: string): string {
  return sectionSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readCourseSections(
  courseRecord: CourseRecord,
  sections: SharedSectionDefinition[],
  preferredLocale?: Locale,
): Promise<CourseSectionPreview[]> {
  return Promise.all(
    sections.map(async (section) => {
      const requestedLocales = [
        preferredLocale,
        courseRecord.manifest.defaultLocale,
      ].filter((locale, index, locales): locale is Locale => {
        return Boolean(locale) && locales.indexOf(locale) === index;
      });
      const localizedSectionMetadata =
        requestedLocales
          .map((locale) => section.locales[locale])
          .find((metadata) => Boolean(metadata)) ?? null;

      return {
        description: localizedSectionMetadata?.description,
        id: section.id,
        lessons: await Promise.all(
          section.lessonIds.map((lessonId) =>
            readCourseLesson(courseRecord, section.id, lessonId, preferredLocale),
          ),
        ),
        locales: section.locales,
        tests: await Promise.all(
          section.testIds.map((testId) =>
            readCourseSectionTest(courseRecord, section.id, testId, preferredLocale),
          ),
        ),
        title: localizedSectionMetadata?.title ?? formatSectionTitle(section.slug),
      };
    }),
  );
}

async function readCourseLessonIds(
  sections: SharedSectionDefinition[],
): Promise<string[]> {
  return [...new Set(sections.flatMap((section) => section.lessonIds))];
}

async function readSharedSectionDefinitions(
  courseRecord: CourseRecord,
): Promise<SharedSectionDefinition[]> {
  let directoryEntries;

  try {
    directoryEntries = await fs.readdir(courseRecord.packageDirectoryPath, {
      withFileTypes: true,
    });
  } catch {
    throw new Error(
      `Unable to read sections for course "${courseRecord.manifest.id}"`,
    );
  }

  const sectionDirectories = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => sectionDirectoryPattern.test(name));

  if (sectionDirectories.length === 0) {
    if (courseRecord.manifest.status === "draft") {
      return [];
    }

    throw new Error(
      `Course "${courseRecord.manifest.id}" does not contain any section-xx-* directories`,
    );
  }

  const indexedSectionDirectories = sectionDirectories.map((sectionId) => {
    const matchedPattern = sectionId.match(sectionDirectoryPattern);

    if (!matchedPattern) {
      throw new Error(
        `Invalid section directory name "${sectionId}" in course "${courseRecord.manifest.id}"`,
      );
    }

    return {
      index: Number.parseInt(matchedPattern[1], 10),
      sectionId,
    };
  });

  const sectionIndexSet = new Set(indexedSectionDirectories.map(({ index }) => index));

  if (sectionIndexSet.size !== indexedSectionDirectories.length) {
    throw new Error(
      `Course "${courseRecord.manifest.id}" contains duplicate section indexes`,
    );
  }

  indexedSectionDirectories.sort((left, right) => left.index - right.index);

  for (let index = 0; index < indexedSectionDirectories.length; index += 1) {
    if (indexedSectionDirectories[index].index !== index + 1) {
      throw new Error(
        `Course "${courseRecord.manifest.id}" must use contiguous section indexes starting at 01`,
      );
    }
  }

  return Promise.all(
    indexedSectionDirectories.map(({ sectionId }) =>
      readSharedSectionDefinition(courseRecord, sectionId),
    ),
  );
}

async function hashDirectoryContents(directoryPath: string): Promise<Record<string, string>> {
  const filePaths = await listFilesRecursively(directoryPath);
  const entries = await Promise.all(
    filePaths.map(async (filePath) => {
      const relativePath = path.relative(directoryPath, filePath);

      return [relativePath, await hashFileContents(filePath)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

// Excluded from the draft-vs-cut-version comparison: `course.json` carries
// the version/updatedAt bookkeeping a cut always changes (its hash in a
// snapshot's own version-meta.json reflects the manifest *before* the cut
// stamps the bumped version into it, so it can never match anyway), and
// `version-meta.json` only exists inside `versions/<x.y.z>/`, never in
// `draft/`. Neither says anything about whether course *content* changed.
const VERSION_BADGE_COMPARISON_EXCLUDED_FILES = new Set(["course.json", "version-meta.json"]);

function areFileHashesEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left).filter(
    (key) => !VERSION_BADGE_COMPARISON_EXCLUDED_FILES.has(key),
  );
  const rightKeys = Object.keys(right).filter(
    (key) => !VERSION_BADGE_COMPARISON_EXCLUDED_FILES.has(key),
  );

  return (
    leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key])
  );
}

/**
 * A "local" course's badge reflects whether its draft has diverged from the
 * last cut version — see `CourseVersionBadge` in src/lib/course-package.ts.
 * A "bundled" course (no draft/ to diverge) is always at its version.
 */
async function computeCourseVersionBadge(courseRecord: CourseRecord): Promise<CourseVersionBadge> {
  const draftDirectoryPath = path.join(courseRecord.courseRootPath, "draft");

  if (courseRecord.packageDirectoryPath !== draftDirectoryPath) {
    return { kind: "version", version: courseRecord.manifest.version };
  }

  const versionsDirectoryPath = path.join(courseRecord.courseRootPath, "versions");
  const mostRecentSnapshot = await findMostRecentSnapshot(versionsDirectoryPath);

  if (!mostRecentSnapshot) {
    return { kind: "draft" };
  }

  const draftFileHashes = await hashDirectoryContents(draftDirectoryPath);

  return areFileHashesEqual(draftFileHashes, mostRecentSnapshot.fileHashes)
    ? { kind: "version", version: courseRecord.manifest.version }
    : { kind: "draft" };
}

async function toCourseSummary(
  courseRecord: CourseRecord,
  localizedCourseMetadata: LocalizedCourseMetadata,
  lessonPreviews: LessonPreview[],
  previewItems: CoursePreviewItem[],
): Promise<CourseSummary> {
  return {
    contentRating: courseRecord.manifest.contentRating,
    defaultLocale: courseRecord.manifest.defaultLocale,
    descriptiveTags: courseRecord.manifest.descriptiveTags ?? [],
    description: localizedCourseMetadata.description,
    distribution: courseRecord.manifest.distribution,
    id: courseRecord.manifest.id,
    lessonPreviews,
    previewItems,
    status: courseRecord.manifest.status,
    supportedLocales: courseRecord.manifest.supportedLocales,
    title: localizedCourseMetadata.title,
    versionBadge: await computeCourseVersionBadge(courseRecord),
    version: courseRecord.manifest.version,
  };
}

export async function listCourses(
  rootDirectoryPath: string,
  preferredLocale?: Locale,
): Promise<CourseSummary[]> {
  const courseRecords = await listCourseRecords(rootDirectoryPath);

  const courseSummaries = await Promise.all(
    courseRecords.map(async (courseRecord) => {
      const localizedCourseMetadata = await readLocalizedCourseMetadata(
        courseRecord,
        preferredLocale,
      );
      const sections = await readSharedSectionDefinitions(courseRecord);
      const lessonPreviews = await readLessonPreviews(courseRecord, sections, preferredLocale);
      const previewItems = await readCoursePreviewItems(
        courseRecord,
        sections,
        preferredLocale,
      );

      return toCourseSummary(
        courseRecord,
        localizedCourseMetadata,
        lessonPreviews,
        previewItems,
      );
    }),
  );

  return courseSummaries.sort((leftCourse, rightCourse) =>
    leftCourse.id.localeCompare(rightCourse.id),
  );
}

export async function getCourseDetails(
  rootDirectoryPath: string,
  courseId: string,
  preferredLocale?: Locale,
): Promise<CourseDetails | null> {
  const courseRecords = await listCourseRecords(rootDirectoryPath);
  const courseRecord =
    courseRecords.find((record) => record.manifest.id === courseId) ?? null;

  if (!courseRecord) {
    return null;
  }

  const localizedCourseMetadata = await readLocalizedCourseMetadata(
    courseRecord,
    preferredLocale,
  );
  const sharedSections = await readSharedSectionDefinitions(courseRecord);
  const sectionIds = sharedSections.map((section) => section.id);
  const lessonIds = await readCourseLessonIds(sharedSections);
  const sections = await readCourseSections(courseRecord, sharedSections, preferredLocale);
  const previewItems = await readCoursePreviewItems(
    courseRecord,
    sharedSections,
    preferredLocale,
  );

  return {
    ...(await toCourseSummary(
      courseRecord,
      localizedCourseMetadata,
      sections.flatMap((section) =>
        section.lessons.map(({ body: _body, test: _test, ...preview }) => preview),
      ),
      previewItems,
    )),
    builtin: courseRecord.manifest.builtin,
    entrySectionId: sectionIds[0] ?? null,
    lessonIds,
    locales: courseRecord.manifest.locales,
    sections,
    sectionIds,
    slug: courseRecord.manifest.slug,
  };
}

type CourseReleaseState = {
  everPublishedVersions: string[];
  publishedAt: string | null;
  publishedVersion: string | null;
};

type CourseVersionMeta = {
  cutAt: string;
  releaseType: CourseVersionReleaseType;
};

async function readCourseReleaseState(
  courseRootPath: string,
): Promise<CourseReleaseState> {
  try {
    const fileContents = await fs.readFile(
      path.join(courseRootPath, "release.json"),
      "utf8",
    );
    const parsed = JSON.parse(fileContents) as Partial<CourseReleaseState>;

    return {
      everPublishedVersions: Array.isArray(parsed.everPublishedVersions)
        ? parsed.everPublishedVersions.filter(
            (version): version is string => typeof version === "string",
          )
        : [],
      publishedAt: typeof parsed.publishedAt === "string" ? parsed.publishedAt : null,
      publishedVersion:
        typeof parsed.publishedVersion === "string" ? parsed.publishedVersion : null,
    };
  } catch {
    return { everPublishedVersions: [], publishedAt: null, publishedVersion: null };
  }
}

async function readCourseVersionMeta(
  versionDirectoryPath: string,
): Promise<CourseVersionMeta> {
  try {
    const fileContents = await fs.readFile(
      path.join(versionDirectoryPath, "version-meta.json"),
      "utf8",
    );
    const parsed = JSON.parse(fileContents) as Partial<CourseVersionMeta>;

    return {
      cutAt: typeof parsed.cutAt === "string" ? parsed.cutAt : "",
      releaseType: isCourseVersionReleaseType(parsed.releaseType)
        ? parsed.releaseType
        : "patch",
    };
  } catch {
    return { cutAt: "", releaseType: "patch" };
  }
}

/**
 * Applies the same structural rules `readSharedSectionDefinitions` already
 * enforces for a non-draft package (at least one section, contiguous
 * indexes, each section has at least one lesson) to an arbitrary directory —
 * used as a cut-time gate so an immutable version snapshot is never created
 * from an incomplete draft. Does not read or write `status` on disk; the
 * override here is purely in-memory, to reuse the existing validation path.
 */
export async function assertCoursePackageIsPublishable(
  packageDirectoryPath: string,
): Promise<void> {
  const rawManifest = await readJsonFile(
    path.join(packageDirectoryPath, "course.json"),
    isRawCourseManifest,
  );
  const manifest = normalizeCourseManifest(rawManifest);

  await readSharedSectionDefinitions({
    courseRootPath: packageDirectoryPath,
    manifest: { ...manifest, status: "published" },
    packageDirectoryPath,
  });
}

export async function getCourseVersionHistory(
  rootDirectoryPath: string,
  courseId: string,
): Promise<CourseVersionHistory | null> {
  const courseRootPath = path.resolve(rootDirectoryPath, courseId);
  const relativeToRoot = path.relative(rootDirectoryPath, courseRootPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  let draftManifest: CourseManifest;

  try {
    const rawManifest = await readJsonFile(
      path.join(courseRootPath, "draft", "course.json"),
      isRawCourseManifest,
    );
    draftManifest = normalizeCourseManifest(rawManifest);
  } catch {
    return null;
  }

  const versionsDirectoryPath = path.join(courseRootPath, "versions");
  let versionDirectoryNames: string[] = [];

  try {
    const directoryEntries = await fs.readdir(versionsDirectoryPath, {
      withFileTypes: true,
    });
    versionDirectoryNames = directoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    versionDirectoryNames = [];
  }

  const releaseState = await readCourseReleaseState(courseRootPath);

  const versionEntries: CourseVersionHistoryEntry[] = await Promise.all(
    versionDirectoryNames.map(async (versionName) => {
      const meta = await readCourseVersionMeta(
        path.join(versionsDirectoryPath, versionName),
      );

      return {
        cutAt: meta.cutAt,
        isCurrentlyPublished: releaseState.publishedVersion === versionName,
        isEverPublished: releaseState.everPublishedVersions.includes(versionName),
        releaseType: meta.releaseType,
        version: versionName,
      };
    }),
  );

  versionEntries.sort((left, right) =>
    compareCourseVersions(parseCourseVersion(right.version), parseCourseVersion(left.version)),
  );

  return {
    currentDraftVersion: draftManifest.version,
    publishedVersion: releaseState.publishedVersion,
    versions: versionEntries,
  };
}
