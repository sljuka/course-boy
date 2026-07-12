import fs from "node:fs/promises";
import path from "node:path";

import type {
  CourseDetails,
  CourseManifest,
  CourseSummary,
  LessonPreview,
  LocalizedCourseMetadata,
  SharedCourseIndex,
} from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

type CourseRecord = {
  directoryPath: string;
  manifest: CourseManifest;
};

type SharedLessonDefinition = {
  id: string;
  icon?: string;
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

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "sr" || value === "sr-Cyrl";
}

function isCourseManifest(value: unknown): value is CourseManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<CourseManifest>;

  return (
    typeof manifest.id === "string" &&
    typeof manifest.version === "string" &&
    typeof manifest.courseType === "string" &&
    typeof manifest.sharedIndex === "string" &&
    typeof manifest.sharedPath === "string" &&
    typeof manifest.localesPath === "string" &&
    isLocale(manifest.defaultLocale) &&
    Array.isArray(manifest.supportedLocales) &&
    manifest.supportedLocales.every(isLocale)
  );
}

function isSharedCourseIndex(value: unknown): value is SharedCourseIndex {
  if (!value || typeof value !== "object") {
    return false;
  }

  const courseIndex = value as Partial<SharedCourseIndex>;

  return (
    typeof courseIndex.id === "string" &&
    typeof courseIndex.slug === "string" &&
    typeof courseIndex.entryLessonId === "string" &&
    Array.isArray(courseIndex.lessonIds) &&
    courseIndex.lessonIds.every((lessonId) => typeof lessonId === "string") &&
    Boolean(courseIndex.templateIds) &&
    typeof courseIndex.templateIds === "object" &&
    Object.values(courseIndex.templateIds).every(
      (templatePath) => typeof templatePath === "string",
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
    (typeof lesson.icon === "undefined" || typeof lesson.icon === "string")
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
        const directoryPath = path.join(rootDirectoryPath, directoryEntry.name);
        const manifestPath = path.join(directoryPath, "manifest.json");

        try {
          const manifest = await readJsonFile(manifestPath, isCourseManifest);

          return {
            directoryPath,
            manifest,
          } satisfies CourseRecord;
        } catch {
          return null;
        }
      }),
  );

  return courseRecords.filter(
    (courseRecord): courseRecord is CourseRecord => courseRecord !== null,
  );
}

function resolveLocalizedCourseMetadataPath(
  courseRecord: CourseRecord,
  locale: Locale,
): string {
  return path.join(
    courseRecord.directoryPath,
    courseRecord.manifest.localesPath,
    locale,
    "course.json",
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
    try {
      return await readJsonFile(
        resolveLocalizedCourseMetadataPath(courseRecord, locale),
        isLocalizedCourseMetadata,
      );
    } catch {
      continue;
    }
  }

  throw new Error(
    `Missing localized metadata for course "${courseRecord.manifest.id}"`,
  );
}

async function readSharedCourseIndex(
  courseRecord: CourseRecord,
): Promise<SharedCourseIndex> {
  return readJsonFile(
    path.join(courseRecord.directoryPath, courseRecord.manifest.sharedIndex),
    isSharedCourseIndex,
  );
}

async function readSharedLessonDefinition(
  courseRecord: CourseRecord,
  lessonId: string,
): Promise<SharedLessonDefinition> {
  return readJsonFile(
    path.join(
      courseRecord.directoryPath,
      courseRecord.manifest.sharedPath,
      "lessons",
      `${lessonId}.json`,
    ),
    isSharedLessonDefinition,
  );
}

function resolveLocalizedLessonPath(
  courseRecord: CourseRecord,
  locale: Locale,
  lessonSlug: string,
): string {
  return path.join(
    courseRecord.directoryPath,
    courseRecord.manifest.localesPath,
    locale,
    "lessons",
    `${lessonSlug}.md`,
  );
}

function extractMarkdownTitle(markdownSource: string): string | null {
  const titleLine = markdownSource
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("# "));

  return titleLine ? titleLine.replace(/^#\s+/, "").trim() : null;
}

async function readLessonPreview(
  courseRecord: CourseRecord,
  lessonId: string,
  preferredLocale?: Locale,
): Promise<LessonPreview> {
  const sharedLesson = await readSharedLessonDefinition(courseRecord, lessonId);
  const requestedLocales = [
    preferredLocale,
    courseRecord.manifest.defaultLocale,
  ].filter((locale, index, locales): locale is Locale => {
    return Boolean(locale) && locales.indexOf(locale) === index;
  });

  for (const locale of requestedLocales) {
    try {
      const lessonMarkdown = await fs.readFile(
        resolveLocalizedLessonPath(courseRecord, locale, sharedLesson.slug),
        "utf8",
      );
      const title = extractMarkdownTitle(lessonMarkdown);

      if (title) {
        return {
          id: lessonId,
          iconUrl: await resolveLessonIconUrl(courseRecord, sharedLesson.icon),
          title,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    id: lessonId,
    iconUrl: await resolveLessonIconUrl(courseRecord, sharedLesson.icon),
    title: sharedLesson.slug.replace(/-/g, " "),
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
  const resolvedIconPath = path.resolve(courseRecord.directoryPath, normalizedIconPath);
  const relativeToCourseRoot = path.relative(
    courseRecord.directoryPath,
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
  lessonIds: string[],
  preferredLocale?: Locale,
): Promise<LessonPreview[]> {
  return Promise.all(
    lessonIds.slice(0, 6).map((lessonId) =>
      readLessonPreview(courseRecord, lessonId, preferredLocale),
    ),
  );
}

function toCourseSummary(
  courseRecord: CourseRecord,
  localizedCourseMetadata: LocalizedCourseMetadata,
  lessonPreviews: LessonPreview[],
): CourseSummary {
  return {
    defaultLocale: courseRecord.manifest.defaultLocale,
    description: localizedCourseMetadata.description,
    id: courseRecord.manifest.id,
    lessonPreviews,
    supportedLocales: courseRecord.manifest.supportedLocales,
    title: localizedCourseMetadata.title,
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
      const [localizedCourseMetadata, sharedCourseIndex] = await Promise.all([
        readLocalizedCourseMetadata(courseRecord, preferredLocale),
        readSharedCourseIndex(courseRecord),
      ]);
      const lessonPreviews = await readLessonPreviews(
        courseRecord,
        sharedCourseIndex.lessonIds,
        preferredLocale,
      );

      return toCourseSummary(
        courseRecord,
        localizedCourseMetadata,
        lessonPreviews,
      );
    }),
  );

  return courseSummaries.sort((leftCourse, rightCourse) =>
    leftCourse.title.localeCompare(rightCourse.title),
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

  const [localizedCourseMetadata, sharedCourseIndex] = await Promise.all([
    readLocalizedCourseMetadata(courseRecord, preferredLocale),
    readSharedCourseIndex(courseRecord),
  ]);

  return {
    ...toCourseSummary(
      courseRecord,
      localizedCourseMetadata,
      await readLessonPreviews(
        courseRecord,
        sharedCourseIndex.lessonIds,
        preferredLocale,
      ),
    ),
    courseType: courseRecord.manifest.courseType,
    entryLessonId: sharedCourseIndex.entryLessonId,
    lessonIds: sharedCourseIndex.lessonIds,
    slug: sharedCourseIndex.slug,
    templateIds: sharedCourseIndex.templateIds,
  };
}
