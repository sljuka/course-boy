import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

const bundledSeedCourseIds = ["matko-getting-started"] as const;
const bundledSeedCourseIdSet = new Set<string>(bundledSeedCourseIds);

type BundledSeedState = {
  removedCourseIds: string[];
};

function getBundledCoursesRoot(): string {
  return path.join(process.env.APP_ROOT, "courses");
}

export function getLocalCoursesRoot(): string {
  return path.join(app.getPath("userData"), "courses");
}

function getBundledSeedStatePath(localCoursesRoot: string): string {
  return path.join(localCoursesRoot, ".bundled-seed-state.json");
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

  return localCoursesRoot;
}

export async function removeLocalCourse(courseId: string): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = path.join(localCoursesRoot, courseId);
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

  await fs.rm(resolvedCourseDirectoryPath, {
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
