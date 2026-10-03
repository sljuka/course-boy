import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseSectionIntro,
  updateLocalCourseSection,
} from "./course-paths";

let userDataDir = "";

vi.mock("electron", () => ({
  app: { getName: () => "matko", getPath: () => userDataDir },
  dialog: { showOpenDialog: vi.fn() },
}));

process.env.APP_ROOT = process.cwd();

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-serbian-script-"));
});

afterEach(async () => {
  await fs.rm(userDataDir, { force: true, recursive: true });
});

const readJson = async (filePath: string) => JSON.parse(await fs.readFile(filePath, "utf8"));

// A course written in Latin only, with one section and one lesson.
async function seedLatinCourse() {
  const { courseId } = await createLocalCourseDraft({
    defaultLocale: "sr",
    locales: { sr: { description: "Sve o brojevima", title: "Brojevi" } },
    supportedLocales: ["sr"],
  });
  const { sectionId } = await createLocalCourseSection({ courseId, title: "Osnove" });
  const { lessonId } = await createLocalCourseLesson({ courseId, sectionId, title: "Sabiranje" });
  const draftDir = path.join(await ensureLocalCoursesRoot(), courseId, "draft");

  await updateLocalCourseLessonContent({
    courseId,
    lessonId,
    locales: { sr: { body: "[matko-block]: <> (markdown)\nKoliko je {{x}}?" } },
    sectionId,
  });

  const setMetadata = (supportedLocales: Array<"sr" | "sr-Cyrl">, serbianScript?: { source: "sr" } | null) =>
    updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId,
      defaultLocale: "sr",
      descriptiveTags: [],
      locales: { sr: { description: "Sve o brojevima", title: "Brojevi" } },
      serbianScript,
      supportedLocales,
    });

  return {
    courseId,
    draftDir,
    lessonBody: (locale: string) =>
      fs.readFile(path.join(draftDir, sectionId, "locales", locale, `${lessonId}.md`), "utf8"),
    lessonId,
    sectionDir: path.join(draftDir, sectionId),
    sectionId,
    setMetadata,
  };
}

describe("generating one Serbian script from the other (SLJ-17)", () => {
  it("turning it on adds Cyrillic and generates it across the whole draft", async () => {
    const course = await seedLatinCourse();

    await course.setMetadata(["sr"], { source: "sr" });

    const manifest = await readJson(path.join(course.draftDir, "course.json"));

    expect(manifest.serbianScript).toEqual({ source: "sr" });
    expect(manifest.supportedLocales).toEqual(expect.arrayContaining(["sr", "sr-Cyrl"]));
    expect(manifest.locales["sr-Cyrl"]).toEqual({ description: "Све о бројевима", title: "Бројеви" });
    expect((await readJson(path.join(course.sectionDir, "section.json"))).locales["sr-Cyrl"].title).toBe(
      "Основе",
    );
    expect(
      (await readJson(path.join(course.sectionDir, `${course.lessonId}.json`))).locales["sr-Cyrl"].title,
    ).toBe("Сабирање");
    expect(await course.lessonBody("sr-Cyrl")).toBe("[matko-block]: <> (markdown)\nКолико је {{x}}?");
  });

  it("generates the other script of a section intro (SLJ-45)", async () => {
    const course = await seedLatinCourse();

    await course.setMetadata(["sr"], { source: "sr" });
    await updateLocalCourseSectionIntro({
      courseId: course.courseId,
      locales: { sr: { body: "[matko-block]: <> (markdown)\nDobro došli." } },
      sectionId: course.sectionId,
    });

    expect(await fs.readFile(path.join(course.sectionDir, "locales", "sr-Cyrl", "intro.md"), "utf8")).toBe(
      "[matko-block]: <> (markdown)\nДобро дошли.",
    );
  });

  it("keeps the generated script in sync on every save, ignoring edits sent for it", async () => {
    const course = await seedLatinCourse();

    await course.setMetadata(["sr"], { source: "sr" });
    await updateLocalCourseLessonContent({
      courseId: course.courseId,
      lessonId: course.lessonId,
      locales: { sr: { body: "Nova lekcija" }, "sr-Cyrl": { body: "ručno" } },
      sectionId: course.sectionId,
    });
    await updateLocalCourseSection({
      courseId: course.courseId,
      locales: {
        sr: { description: "", title: "Početak" },
        "sr-Cyrl": { description: "", title: "staro" },
      },
      sectionId: course.sectionId,
    });

    expect(await course.lessonBody("sr-Cyrl")).toBe("Нова лекција");
    expect((await readJson(path.join(course.sectionDir, "section.json"))).locales["sr-Cyrl"].title).toBe(
      "Почетак",
    );

    // Both scripts are on disk, so a cut version needs no generator.
    const { version } = await cutLocalCourseVersion({ courseId: course.courseId, releaseType: "patch" });
    const versionBody = await fs.readFile(
      path.join(
        path.dirname(course.draftDir),
        "versions",
        version,
        course.sectionId,
        "locales",
        "sr-Cyrl",
        `${course.lessonId}.md`,
      ),
      "utf8",
    );

    expect(versionBody).toBe("Нова лекција");
  });

  it("drops the setting when a Serbian locale is taken off the course, and when set to separately", async () => {
    const course = await seedLatinCourse();

    await course.setMetadata(["sr"], { source: "sr" });
    await course.setMetadata(["sr"]);
    expect((await readJson(path.join(course.draftDir, "course.json"))).serbianScript).toBeUndefined();

    await course.setMetadata(["sr"], { source: "sr" });
    await course.setMetadata(["sr", "sr-Cyrl"], null);

    const manifest = await readJson(path.join(course.draftDir, "course.json"));

    expect(manifest.serbianScript).toBeUndefined();
    expect(manifest.supportedLocales).toEqual(expect.arrayContaining(["sr", "sr-Cyrl"]));
  });

  it("keeps generating from creation when the course was created with Cyrillic derived from Latin", async () => {
    const { courseId } = await createLocalCourseDraft({
      defaultLocale: "sr",
      deriveSrCyrlFromSr: true,
      locales: { sr: { description: "", title: "Brojevi" } },
      supportedLocales: ["sr"],
    });
    const manifest = await readJson(path.join(await ensureLocalCoursesRoot(), courseId, "draft", "course.json"));

    expect(manifest.serbianScript).toEqual({ source: "sr" });
  });
});
