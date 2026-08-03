import fs from "node:fs/promises";
import path from "node:path";

import type {
  CourseTest,
  CourseTestStructureRule,
  CourseExerciseSolutionSpace,
  CourseExerciseVariable,
  CourseLesson,
  CourseSectionPreview,
  CourseDetails,
  CourseManifest,
  CoursePreviewItem,
  CourseSummary,
  CourseStatus,
  LessonPreview,
  LocalizedCourseMetadata,
  LocalizedLessonMetadata,
  LocalizedSectionMetadata,
  StoredSectionDefinition,
} from "../src/lib/course-package";
import type { Locale } from "../src/lib/i18n";

type CourseRecord = {
  directoryPath: string;
  manifest: CourseManifest;
};

type RawCourseManifest = Omit<CourseManifest, "status"> & {
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
  slug: string;
};

type SharedTestExerciseDefinition = {
  locales: Record<Locale, { hint?: string; prompt: string }>;
  solution: {
    formula: string;
    precision: number;
    space?: CourseExerciseSolutionSpace;
  };
  tags: string[];
  variables: Record<string, CourseExerciseVariable>;
};

type SharedTestDefinition = {
  exercises: SharedTestExerciseDefinition[];
  structure?: CourseTestStructureRule[];
  template: string;
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

function extractTemplateVariables(source: string): string[] {
  return [...source.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "sr" || value === "sr-Cyrl";
}

function isCourseStatus(value: unknown): value is CourseStatus {
  return value === "draft" || value === "published";
}

function isRawCourseManifest(value: unknown): value is RawCourseManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<RawCourseManifest>;

  return (
    typeof manifest.id === "string" &&
    typeof manifest.version === "string" &&
    typeof manifest.builtin === "boolean" &&
    typeof manifest.slug === "string" &&
    (typeof manifest.status === "undefined" || isCourseStatus(manifest.status)) &&
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

function isSharedTestDefinition(
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

  function isSolutionSpace(
    solutionSpace: unknown,
  ): solutionSpace is CourseExerciseSolutionSpace {
    return (
      (typeof solutionSpace === "number" &&
        Number.isInteger(solutionSpace) &&
        solutionSpace > 0) ||
      solutionSpace === "sm" ||
      solutionSpace === "md" ||
      solutionSpace === "lg" ||
      solutionSpace === "xl"
    );
  }

  const exercisesAreValid = test.exercises.every((exercise) => {
    if (!exercise || typeof exercise !== "object") {
      return false;
    }

    if (
      !Array.isArray(exercise.tags) ||
      exercise.tags.length === 0 ||
      !exercise.tags.every((tag) => typeof tag === "string" && tag.length > 0)
    ) {
      return false;
    }

    if (
      !exercise.locales ||
      typeof exercise.locales !== "object" ||
      !Object.entries(exercise.locales).every(([locale, metadata]) => {
        return (
          isLocale(locale) &&
          Boolean(metadata) &&
          typeof metadata === "object" &&
          typeof metadata.prompt === "string" &&
          (typeof metadata.hint === "undefined" || typeof metadata.hint === "string")
        );
      })
    ) {
      return false;
    }

    if (
      !exercise.solution ||
      typeof exercise.solution !== "object" ||
      typeof exercise.solution.formula !== "string" ||
      typeof exercise.solution.precision !== "number" ||
      (typeof exercise.solution.space !== "undefined" &&
        !isSolutionSpace(exercise.solution.space)) ||
      !exercise.variables ||
      typeof exercise.variables !== "object" ||
      !Object.values(exercise.variables).every((variable) => {
        if (!variable || typeof variable !== "object") {
          return false;
        }

        const typedVariable = variable as Partial<CourseExerciseVariable>;

        return (
          typedVariable.type === "integer" &&
          typeof typedVariable.min === "number" &&
          typeof typedVariable.max === "number"
        );
      })
    ) {
      return false;
    }

    const variableNames = new Set(Object.keys(exercise.variables));

    return Object.values(exercise.locales).every((metadata) => {
      return extractTemplateVariables(metadata.prompt).every((variableName) =>
        variableNames.has(variableName),
      );
    });
  });

  if (!exercisesAreValid) {
    return false;
  }

  if (typeof test.structure === "undefined") {
    return true;
  }

  if (
    !Array.isArray(test.structure) ||
    !test.structure.every((rule) => {
      return (
        Boolean(rule) &&
        typeof rule === "object" &&
        typeof rule.tag === "string" &&
        typeof rule.count === "number" &&
        Number.isInteger(rule.count) &&
        rule.count > 0
      );
    })
  ) {
    return false;
  }

  const exerciseTagCounts = new Map<string, number>();
  for (const exercise of test.exercises) {
    for (const tag of exercise.tags) {
      exerciseTagCounts.set(tag, (exerciseTagCounts.get(tag) ?? 0) + 1);
    }
  }

  return test.structure.every((rule) => (exerciseTagCounts.get(rule.tag) ?? 0) >= rule.count);
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
  return {
    ...manifest,
    status: manifest.status ?? "published",
  };
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
        const manifestPath = path.join(directoryPath, "course.json");

        try {
          const rawManifest = await readJsonFile(manifestPath, isRawCourseManifest);
          const manifest = normalizeCourseManifest(rawManifest);

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
  return path.join(courseRecord.directoryPath, sectionId);
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

  if (lessonIds.length === 0) {
    throw new Error(`Section "${sectionId}" does not contain any lesson-xx-* files`);
  }

  return {
    ...storedSection,
    lessonIds,
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

  return {
    exercises: sharedTest.exercises.map((exercise, index) => ({
      formula: exercise.solution.formula,
      hint: requestedLocales
        .map((locale) => exercise.locales[locale]?.hint)
        .find((hint) => typeof hint === "string"),
      id: `${testId}#${index + 1}`,
      precision: exercise.solution.precision,
      prompt:
        requestedLocales
          .map((locale) => exercise.locales[locale]?.prompt)
          .find((prompt) => typeof prompt === "string") ?? "",
      solutionSpace: exercise.solution.space ?? "sm",
      tags: exercise.tags,
      variables: exercise.variables,
    })),
    id: testId,
    structure: sharedTest.structure,
  };
}

function resolveTestIdForLesson(lessonId: string): string {
  return lessonId.replace(/^lesson-/, "test-");
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
  const previewItems = await Promise.all(
    sections.flatMap((section) =>
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
  );

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
    directoryEntries = await fs.readdir(courseRecord.directoryPath, {
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

function toCourseSummary(
  courseRecord: CourseRecord,
  localizedCourseMetadata: LocalizedCourseMetadata,
  lessonPreviews: LessonPreview[],
  previewItems: CoursePreviewItem[],
): CourseSummary {
  return {
    defaultLocale: courseRecord.manifest.defaultLocale,
    description: localizedCourseMetadata.description,
    id: courseRecord.manifest.id,
    lessonPreviews,
    previewItems,
    status: courseRecord.manifest.status,
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
    ...toCourseSummary(
      courseRecord,
      localizedCourseMetadata,
      sections.flatMap((section) =>
        section.lessons.map(({ body: _body, test: _test, ...preview }) => preview),
      ),
      previewItems,
    ),
    builtin: courseRecord.manifest.builtin,
    entrySectionId: sectionIds[0] ?? null,
    lessonIds,
    sections,
    sectionIds,
    slug: courseRecord.manifest.slug,
  };
}
