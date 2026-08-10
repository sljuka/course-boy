import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type {
  ContentRating,
  CreateCourseDraftInput,
  CreateCourseSectionInput,
  CourseStatus,
  CourseManifest,
  UpdateCourseDraftMetadataInput,
} from "../src/lib/course-package";
import { locales, type Locale } from "../src/lib/i18n";
import {
  createInitialCourseVersion,
  formatCourseVersion,
} from "../src/lib/course-versioning";
import { transliterateSerbianLatinToCyrillic } from "../src/lib/serbian-transliteration";

const bundledSeedCourseIds = ["matko-getting-started"] as const;
const bundledSeedCourseIdSet = new Set<string>(bundledSeedCourseIds);

type BundledSeedState = {
  removedCourseIds: string[];
};

function normalizeContentRating(value: unknown): ContentRating {
  if (
    value === "all-ages" ||
    value === "mature-themes" ||
    value === "explicit"
  ) {
    return value;
  }

  return "all-ages";
}

function getBundledCoursesRoot(): string {
  return path.join(process.env.APP_ROOT, "courses");
}

export function getLocalCoursesRoot(): string {
  return path.join(app.getPath("userData"), "courses");
}

function getBundledSeedStatePath(localCoursesRoot: string): string {
  return path.join(localCoursesRoot, ".bundled-seed-state.json");
}

function getDraftDirectoryPath(courseRootPath: string): string {
  return path.join(courseRootPath, "draft");
}

async function readBundledSeedState(
  localCoursesRoot: string,
): Promise<BundledSeedState> {
  try {
    const rawState = await fs.readFile(
      getBundledSeedStatePath(localCoursesRoot),
      "utf8",
    );
    const parsedState = JSON.parse(rawState) as Partial<BundledSeedState>;

    return {
      removedCourseIds: Array.isArray(parsedState.removedCourseIds)
        ? parsedState.removedCourseIds.filter(
            (courseId): courseId is string => typeof courseId === "string",
          )
        : [],
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return { removedCourseIds: [] };
    }

    throw error;
  }
}

async function writeBundledSeedState(
  localCoursesRoot: string,
  state: BundledSeedState,
): Promise<void> {
  await fs.writeFile(
    getBundledSeedStatePath(localCoursesRoot),
    JSON.stringify(state, null, 2),
  );
}

export async function ensureLocalCoursesRoot(): Promise<string> {
  const localCoursesRoot = getLocalCoursesRoot();

  await fs.mkdir(localCoursesRoot, { recursive: true });

  try {
    const bundledCoursesRoot = getBundledCoursesRoot();
    const bundledSeedState = await readBundledSeedState(localCoursesRoot);
    const removedCourseIds = new Set(bundledSeedState.removedCourseIds);

    await Promise.all(
      bundledSeedCourseIds.map(async (courseId) => {
        if (removedCourseIds.has(courseId)) {
          return;
        }

        const sourcePath = path.join(bundledCoursesRoot, courseId);
        const targetPath = path.join(localCoursesRoot, courseId);

        await fs.cp(sourcePath, targetPath, {
          errorOnExist: false,
          force: true,
          recursive: true,
        });
      }),
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  await migrateNonBundledCoursesToDrafts(localCoursesRoot);

  return localCoursesRoot;
}

export async function removeLocalCourse(courseId: string): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const resolvedCourseRootPath = path.resolve(courseRootPath);
  const relativeToCoursesRoot = path.relative(
    localCoursesRoot,
    resolvedCourseRootPath,
  );

  if (
    relativeToCoursesRoot.startsWith("..") ||
    path.isAbsolute(relativeToCoursesRoot)
  ) {
    throw new Error(`Invalid course id "${courseId}"`);
  }

  await fs.rm(resolvedCourseRootPath, {
    force: true,
    recursive: true,
  });

  if (bundledSeedCourseIdSet.has(courseId)) {
    const bundledSeedState = await readBundledSeedState(localCoursesRoot);

    if (!bundledSeedState.removedCourseIds.includes(courseId)) {
      bundledSeedState.removedCourseIds.push(courseId);
      bundledSeedState.removedCourseIds.sort();
      await writeBundledSeedState(localCoursesRoot, bundledSeedState);
    }
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function resolveUniqueCourseId(
  localCoursesRoot: string,
  baseId: string,
): Promise<string> {
  let candidateId = baseId;
  let suffix = 2;
  let isUnique = false;

  while (!isUnique) {
    try {
      await fs.access(path.join(localCoursesRoot, candidateId));
      candidateId = `${baseId}-${suffix}`;
      suffix += 1;
    } catch {
      isUnique = true;
    }
  }

  return candidateId;
}

function resolveCourseDirectoryPath(
  localCoursesRoot: string,
  courseId: string,
): string {
  const courseDirectoryPath = getDraftDirectoryPath(path.join(localCoursesRoot, courseId));
  const resolvedCourseDirectoryPath = path.resolve(courseDirectoryPath);
  const relativeToCoursesRoot = path.relative(
    localCoursesRoot,
    resolvedCourseDirectoryPath,
  );

  if (
    relativeToCoursesRoot.startsWith("..") ||
    path.isAbsolute(relativeToCoursesRoot)
  ) {
    throw new Error(`Invalid course id "${courseId}"`);
  }

  return resolvedCourseDirectoryPath;
}

async function readCourseManifest(
  courseDirectoryPath: string,
): Promise<CourseManifest> {
  const fileContents = await fs.readFile(
    path.join(courseDirectoryPath, "course.json"),
    "utf8",
  );

  return JSON.parse(fileContents) as CourseManifest;
}

async function writeCourseManifest(
  courseDirectoryPath: string,
  manifest: CourseManifest & Record<string, unknown>,
): Promise<void> {
  await fs.writeFile(
    path.join(courseDirectoryPath, "course.json"),
    JSON.stringify(manifest, null, 2),
  );
}

async function migrateNonBundledCoursesToDrafts(
  localCoursesRoot: string,
): Promise<void> {
  const directoryEntries = await fs.readdir(localCoursesRoot, {
    withFileTypes: true,
  });

  await Promise.all(
    directoryEntries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        if (bundledSeedCourseIdSet.has(entry.name)) {
          return;
        }

        const courseRootPath = path.join(localCoursesRoot, entry.name);
        const draftDirectoryPath = getDraftDirectoryPath(courseRootPath);

        try {
          await fs.access(draftDirectoryPath);
        } catch {
          const courseRootEntries = await fs.readdir(courseRootPath, {
            withFileTypes: true,
          });

          if (!courseRootEntries.some((childEntry) => childEntry.name === "course.json")) {
            return;
          }

          await fs.mkdir(draftDirectoryPath, { recursive: true });

          await Promise.all(
            courseRootEntries
              .filter((childEntry) => !childEntry.name.startsWith("."))
              .map(async (childEntry) => {
                const sourcePath = path.join(courseRootPath, childEntry.name);
                const targetPath = path.join(draftDirectoryPath, childEntry.name);

                await fs.rename(sourcePath, targetPath);
              }),
          );
        }

        try {
          const manifest = await readCourseManifest(draftDirectoryPath);

          if (manifest.status === "draft") {
            return;
          }

          await writeCourseManifest(draftDirectoryPath, {
            ...manifest,
            status: "draft",
          });
        } catch {
          return;
        }
      }),
  );
}

async function resolveNextSectionId(courseDirectoryPath: string, title: string) {
  const directoryEntries = await fs.readdir(courseDirectoryPath, {
    withFileTypes: true,
  });
  const sectionIndexes = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(/^section-(\d{2})-[a-z0-9-]+$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number.parseInt(match[1], 10))
    .sort((left, right) => left - right);
  const nextIndex = (sectionIndexes.at(-1) ?? 0) + 1;
  const slug = slugify(title) || "untitled-section";

  return `section-${String(nextIndex).padStart(2, "0")}-${slug}`;
}

function normalizeSupportedLocales(
  defaultLocale: Locale,
  supportedLocales: Locale[],
): Locale[] {
  const localeSet = new Set<Locale>([defaultLocale]);

  for (const locale of supportedLocales) {
    if (locales.includes(locale)) {
      localeSet.add(locale);
    }
  }

  return locales.filter((locale) => localeSet.has(locale));
}

function resolveCourseStatus(): CourseStatus {
  return "draft";
}

function resolveLocaleSource(
  locale: Locale,
  supportedLocales: Locale[],
  deriveSrCyrlFromSr?: boolean,
): Locale {
  if (
    locale === "sr-Cyrl" &&
    deriveSrCyrlFromSr === true &&
    supportedLocales.includes("sr")
  ) {
    return "sr";
  }

  return locale;
}

export async function createLocalCourseDraft(
  input: CreateCourseDraftInput,
): Promise<{ courseId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const supportedLocales = normalizeSupportedLocales(
    input.defaultLocale,
    input.deriveSrCyrlFromSr && input.supportedLocales.includes("sr")
      ? [...input.supportedLocales, "sr-Cyrl"]
      : input.supportedLocales,
  );
  const normalizedLocales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const sourceLocale = resolveLocaleSource(
        locale,
        supportedLocales,
        input.deriveSrCyrlFromSr,
      );

      if (sourceLocale === "sr" && locale === "sr-Cyrl" && input.locales.sr) {
        return [
          locale,
          {
            title: transliterateSerbianLatinToCyrillic(
              input.locales.sr.title.trim(),
            ),
            description: transliterateSerbianLatinToCyrillic(
              input.locales.sr.description.trim(),
            ),
          },
        ]
      }

      return [
        locale,
        {
          title: input.locales[locale]?.title.trim() ?? "",
          description: input.locales[locale]?.description.trim() ?? "",
        },
      ]
    }),
  ) as CreateCourseDraftInput["locales"];
  const normalizedTitle = normalizedLocales[input.defaultLocale]?.title ?? "";
  const slugBase = slugify(normalizedTitle) || "untitled-course";
  const courseId = await resolveUniqueCourseId(localCoursesRoot, slugBase);
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const courseDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const nowIso = new Date().toISOString();
  const versionInfo = createInitialCourseVersion();

  await fs.mkdir(courseDirectoryPath, { recursive: true });

  await fs.writeFile(
    path.join(courseDirectoryPath, "course.json"),
    JSON.stringify(
      {
        courseSchemaVersion: "1",
        id: courseId,
        version: formatCourseVersion(versionInfo),
        versionInfo,
        defaultLocale: input.defaultLocale,
        contentRating: "all-ages",
        supportedLocales,
        builtin: false,
        slug: courseId,
        status: resolveCourseStatus(),
        minAppVersion: "0.1.0",
        createdAt: nowIso,
        updatedAt: nowIso,
        publisher: {
          id: slugify(app.getName()) || "matko",
          displayName: app.getName(),
        },
        distribution: "local",
        isSeededOnFirstRun: false,
        locales: normalizedLocales,
      },
      null,
      2,
    ),
  );

  return { courseId };
}

export async function createLocalCourseSection(
  input: CreateCourseSectionInput,
): Promise<{ sectionId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const normalizedTitle = input.title.trim();
  const normalizedDescription = input.description?.trim() ?? "";

  if (!normalizedTitle) {
    throw new Error("Section title is required");
  }

  const sectionId = await resolveNextSectionId(courseDirectoryPath, normalizedTitle);
  const sectionDirectoryPath = path.join(courseDirectoryPath, sectionId);
  const defaultLocale = manifest.defaultLocale;
  const localizedSectionMetadata = Object.fromEntries(
    manifest.supportedLocales.map((locale) => [
      locale,
      {
        title: normalizedTitle,
        description:
          locale === defaultLocale ? normalizedDescription : "",
      },
    ]),
  );
  const nowIso = new Date().toISOString();

  await fs.mkdir(sectionDirectoryPath, { recursive: true });
  await fs.writeFile(
    path.join(sectionDirectoryPath, "section.json"),
    JSON.stringify(
      {
        id: sectionId,
        slug: sectionId.replace(/^section-\d{2}-/, ""),
        locales: localizedSectionMetadata,
      },
      null,
      2,
    ),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: nowIso,
  });

  return { sectionId };
}

export async function updateLocalCourseDraftMetadata(
  input: UpdateCourseDraftMetadataInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const supportedLocales = normalizeSupportedLocales(
    manifest.defaultLocale,
    input.supportedLocales,
  );
  const defaultLocaleMetadata = manifest.locales[manifest.defaultLocale] ?? {
    description: "",
    title: "",
  };
  const nextLocales = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      locale === manifest.defaultLocale
        ? {
            description: input.description.trim(),
            title: input.title.trim(),
          }
        : (manifest.locales[locale] ?? {
            description: "",
            title: locale === manifest.defaultLocale
              ? input.title.trim()
              : defaultLocaleMetadata.title,
          }),
    ]),
  ) as CourseManifest["locales"];

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    contentRating: normalizeContentRating(input.contentRating),
    locales: nextLocales,
    supportedLocales,
    updatedAt: new Date().toISOString(),
  });
}
