import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeCourseChanges, findMissingAssets } from "./course-changes";
import {
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  createLocalCourseSectionTest,
  cutLocalCourseVersion,
  deleteLocalCourseLesson,
  ensureLocalCoursesRoot,
  removeLocalCourseSectionIntro,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseSection,
  updateLocalCourseSectionIntro,
  uploadCourseAssetFromBytes,
} from "./course-paths";

let userDataDir = "";

vi.mock("electron", () => ({
  app: { getName: () => "matko", getPath: () => userDataDir },
  dialog: { showOpenDialog: vi.fn() },
}));

process.env.APP_ROOT = process.cwd();

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-course-changes-"));
});

afterEach(async () => {
  await fs.rm(userDataDir, { force: true, recursive: true });
});

// A course with one section and one lesson, cut once: the baseline.
async function seedCutCourse() {
  const { courseId } = await createLocalCourseDraft({
    defaultLocale: "en",
    locales: { en: { description: "", title: "Numbers" } },
    supportedLocales: ["en"],
  });
  const { sectionId } = await createLocalCourseSection({ courseId, title: "Basics" });
  const { lessonId } = await createLocalCourseLesson({ courseId, sectionId, title: "Addition" });
  const { version } = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
  const courseRoot = path.join(await ensureLocalCoursesRoot(), courseId);

  return {
    changes: () =>
      computeCourseChanges(path.join(courseRoot, "draft"), path.join(courseRoot, "versions", version)),
    courseId,
    draftDir: path.join(courseRoot, "draft"),
    lessonId,
    sectionId,
  };
}

describe("computeCourseChanges", () => {
  it("is empty right after a cut, and before any version exists", async () => {
    const course = await seedCutCourse();

    expect(await course.changes()).toEqual([]);
    expect(await computeCourseChanges(course.draftDir, null)).toEqual([]);
  });

  it("names added, edited and removed lessons and sections by their titles", async () => {
    const course = await seedCutCourse();

    await updateLocalCourseLessonContent({
      courseId: course.courseId,
      lessonId: course.lessonId,
      locales: { en: { body: "New text" } },
      sectionId: course.sectionId,
    });
    await createLocalCourseLesson({ courseId: course.courseId, sectionId: course.sectionId, title: "Subtraction" });
    await createLocalCourseSection({ courseId: course.courseId, title: "Fractions" });
    await updateLocalCourseSection({
      courseId: course.courseId,
      locales: { en: { description: "Start here", title: "Basics" } },
      sectionId: course.sectionId,
    });

    expect(await course.changes()).toEqual([
      { kind: "edited", target: "section", title: "Basics" },
      { kind: "edited", section: "Basics", target: "lesson", title: "Addition" },
      { kind: "added", section: "Basics", target: "lesson", title: "Subtraction" },
      { kind: "added", target: "section", title: "Fractions" },
    ]);

    await deleteLocalCourseLesson({
      courseId: course.courseId,
      lessonId: course.lessonId,
      sectionId: course.sectionId,
    });

    expect(await course.changes()).toContainEqual({
      kind: "removed",
      section: "Basics",
      target: "lesson",
      title: "Addition",
    });
  });

  // A standalone section test is `section-test-NN-slug.json`, unlike a lesson's
  // `test-NN-slug.json`; it was once missed, so adding an exercise to it
  // showed "No changes" while the draft badge (rightly) saw one.
  it("names added and edited standalone section tests", async () => {
    const course = await seedCutCourse();
    const { testId } = await createLocalCourseSectionTest({
      courseId: course.courseId,
      sectionId: course.sectionId,
      title: "Final quiz",
    });

    expect(await course.changes()).toEqual([
      { kind: "added", section: "Basics", target: "test", title: "Final quiz" },
    ]);

    await cutLocalCourseVersion({ courseId: course.courseId, releaseType: "patch" });
    const courseRoot = path.dirname(course.draftDir);
    const testFile = path.join(course.draftDir, (await fs.readdir(course.draftDir)).find((name) => name.startsWith("section-"))!, `${testId}.json`);
    const test = JSON.parse(await fs.readFile(testFile, "utf8"));
    await fs.writeFile(`${testFile}.tmp`, JSON.stringify({ ...test, exercises: [{ kind: "region-picker" }] }));
    await fs.rename(`${testFile}.tmp`, testFile);
    const newest = (await fs.readdir(path.join(courseRoot, "versions"))).sort().at(-1)!;

    expect(
      await computeCourseChanges(course.draftDir, path.join(courseRoot, "versions", newest)),
    ).toEqual([{ kind: "edited", section: "Basics", target: "test", title: "Final quiz" }]);
  });

  it("lists course-level edits and language changes", async () => {
    const course = await seedCutCourse();

    await updateLocalCourseDraftMetadata({
      contentRating: "mature-themes",
      courseId: course.courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "All about numbers", title: "Numbers 2" }, sr: { description: "", title: "Brojevi" } },
      supportedLocales: ["en", "sr"],
    });

    expect(await course.changes()).toEqual([
      { field: "title", kind: "edited", target: "course" },
      { field: "description", kind: "edited", target: "course" },
      { kind: "added", locale: "sr", target: "language" },
      { field: "contentRating", kind: "edited", target: "course" },
    ]);
  });

  it("reports a new language as one change, not as a title or description edit", async () => {
    const course = await seedCutCourse();

    await updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId: course.courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "", title: "Numbers" }, sr: { description: "Opis", title: "Brojevi" } },
      supportedLocales: ["en", "sr"],
    });

    expect(await course.changes()).toEqual([{ kind: "added", locale: "sr", target: "language" }]);
  });

  // SLJ-37: mnemonics live in each language's metadata; saving keeps only
  // valid rows, keeps them across saves that don't send them, and a change is
  // its own entry when cutting a version.
  it("stores valid mnemonics, keeps them when not sent, and lists them as one change", async () => {
    const course = await seedCutCourse();
    const save = (mnemonics?: unknown) =>
      updateLocalCourseDraftMetadata({
        contentRating: "all-ages",
        courseId: course.courseId,
        defaultLocale: "en",
        descriptiveTags: [],
        locales: {
          en: {
            description: "",
            title: "Numbers",
            ...(mnemonics === undefined ? {} : { mnemonics: mnemonics as never }),
          },
        },
        supportedLocales: ["en"],
      });
    const stored = async () =>
      JSON.parse(await fs.readFile(path.join(course.draftDir, "course.json"), "utf8")).locales.en.mnemonics;

    await save([
      { aliases: ["sevens", ""], mnemonic: " 7️⃣🎲 ", showFirst: 2, term: " Seven " },
      { mnemonic: "", term: "half typed" },
    ]);
    expect(await stored()).toEqual([{ aliases: ["sevens"], mnemonic: "7️⃣🎲", showFirst: 2, term: "Seven" }]);
    expect(await course.changes()).toEqual([{ field: "mnemonics", kind: "edited", target: "course" }]);

    await save();
    expect(await stored()).toHaveLength(1);

    await save([]);
    expect(await stored()).toBeUndefined();
    expect(await course.changes()).toEqual([]);
  });

  it("counts files added to the content", async () => {
    const course = await seedCutCourse();
    const { path: filename } = await uploadCourseAssetFromBytes({
      courseId: course.courseId,
      data: new TextEncoder().encode("<svg/>").buffer,
      filename: "diagram.svg",
      kind: "image",
    });

    await updateLocalCourseLessonContent({
      courseId: course.courseId,
      lessonId: course.lessonId,
      locales: { en: { body: `![Diagram](${filename})` } },
      sectionId: course.sectionId,
    });

    expect(await course.changes()).toContainEqual({ count: 1, kind: "added", target: "files" });
  });
});

describe("section intro changes (SLJ-45)", () => {
  it("names an intro added, edited and removed, not as a section edit", async () => {
    const course = await seedCutCourse();
    const writeIntro = (body: string) =>
      updateLocalCourseSectionIntro({ courseId: course.courseId, locales: { en: { body } }, sectionId: course.sectionId });

    await writeIntro("[matko-block]: <> (markdown)\nWelcome.");
    expect(await course.changes()).toEqual([{ kind: "added", section: "Basics", target: "section-intro" }]);

    // Committed, then edited.
    await cutLocalCourseVersion({ courseId: course.courseId, releaseType: "patch" });
    const courseRoot = path.join(await ensureLocalCoursesRoot(), course.courseId);
    const changesSince = (version: string) =>
      computeCourseChanges(path.join(courseRoot, "draft"), path.join(courseRoot, "versions", version));
    await writeIntro("[matko-block]: <> (markdown)\nWelcome back.");
    expect(await changesSince("0.1.2")).toEqual([{ kind: "edited", section: "Basics", target: "section-intro" }]);

    await removeLocalCourseSectionIntro({ courseId: course.courseId, sectionId: course.sectionId });
    expect(await changesSince("0.1.2")).toEqual([{ kind: "removed", section: "Basics", target: "section-intro" }]);
  });

  it("says a missing file is used in the section's intro", async () => {
    const course = await seedCutCourse();

    await updateLocalCourseSectionIntro({
      courseId: course.courseId,
      locales: { en: { body: "![Gone](diagram-0123456789abcdef.svg)" } },
      sectionId: course.sectionId,
    });

    expect(await findMissingAssets(course.draftDir)).toEqual([
      { filename: "diagram-0123456789abcdef.svg", location: { section: "Basics", target: "section-intro" } },
    ]);
  });
});

describe("findMissingAssets", () => {
  it("reports a referenced file that isn't in assets/, with where it's used", async () => {
    const course = await seedCutCourse();

    expect(await findMissingAssets(course.draftDir)).toEqual([]);

    await updateLocalCourseLessonContent({
      courseId: course.courseId,
      lessonId: course.lessonId,
      locales: { en: { body: "![Gone](diagram-0123456789abcdef.svg)" } },
      sectionId: course.sectionId,
    });

    expect(await findMissingAssets(course.draftDir)).toEqual([
      {
        filename: "diagram-0123456789abcdef.svg",
        location: { section: "Basics", target: "lesson", title: "Addition" },
      },
    ]);
  });
});
