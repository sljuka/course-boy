import { describe, expect, it } from "vitest";

import {
  appLinkPath,
  courseAppLink,
  courseIdOfPath,
  importAppLink,
  lessonAppLink,
  newestAppLink,
  parseAppLink,
  programAppLink,
  shareCodeFromText,
  thisCourseLessonAppLink,
} from "@/lib/app-links";

const COURSE = "thys2vej6my5mpxt";

// SLJ-60: links to course content, written into lessons and copied.
describe("parseAppLink", () => {
  it("reads the three kinds of link", () => {
    expect(parseAppLink(`matko://course/${COURSE}`)).toEqual({ courseId: COURSE, kind: "course" });
    expect(parseAppLink(`matko://course/${COURSE}/lesson/lesson-01-welcome`)).toEqual({
      courseId: COURSE,
      kind: "lesson",
      lessonId: "lesson-01-welcome",
    });
    expect(parseAppLink("matko://lesson/lesson-01-welcome")).toEqual({
      courseId: null,
      kind: "lesson",
      lessonId: "lesson-01-welcome",
    });
  });

  it("round-trips what Copy link makes, and refuses anything else", () => {
    expect(parseAppLink(lessonAppLink(COURSE, "lesson-02"))).toMatchObject({ courseId: COURSE, lessonId: "lesson-02" });
    expect(parseAppLink(courseAppLink(COURSE))).toMatchObject({ courseId: COURSE, kind: "course" });
    expect(parseAppLink(thisCourseLessonAppLink("lesson-02"))).toEqual({ courseId: null, kind: "lesson", lessonId: "lesson-02" });
    expect(parseAppLink("https://example.com")).toBeNull();
    expect(parseAppLink("matko://course/not-a-course-id")).toBeNull();
    expect(parseAppLink(`matko://course/${COURSE}/lesson/../../etc`)).toBeNull();
    expect(parseAppLink("matko://import/abc")).toBeNull();
    const code = "ybndrfg8ejkmcpqxot1uwisza345h769".repeat(2).slice(0, 52);
    expect(parseAppLink(importAppLink(code))).toEqual({ code, kind: "import" });
    expect(parseAppLink(`matko://import/${code.toUpperCase()}`)).toEqual({ code, kind: "import" });
    expect(parseAppLink(`matko://import/${"ab".repeat(32)}`)).toEqual({ code: "ab".repeat(32), kind: "import" });
    expect(parseAppLink(programAppLink(COURSE))).toEqual({ kind: "program", programId: COURSE });
    expect(parseAppLink(programAppLink(COURSE, "channel"))).toEqual({ kind: "channel", programId: COURSE });
    expect(parseAppLink("matko://program/nope")).toBeNull();
  });
});

describe("appLinkPath", () => {
  const course = { lessonIds: ["lesson-01", "lesson-02"] };

  it("opens a lesson in the player, or in the editor when that course is being edited", () => {
    const link = { courseId: COURSE, kind: "lesson", lessonId: "lesson-02" } as const;
    expect(appLinkPath(link, { course, currentPath: "/" })).toBe(`/courses/${COURSE}/lessons/lesson-02`);
    expect(appLinkPath(link, { course, currentPath: `/drafts/${COURSE}` })).toBe(
      `/drafts/${COURSE}?node=document%3Alesson-02`,
    );
  });

  it("takes the course from the page for a link without one", () => {
    const link = { courseId: null, kind: "lesson", lessonId: "lesson-01" } as const;
    expect(appLinkPath(link, { course, currentPath: `/courses/${COURSE}/lessons/lesson-02` })).toBe(
      `/courses/${COURSE}/lessons/lesson-01`,
    );
    expect(appLinkPath(link, { course, currentPath: "/settings" })).toBeNull();
  });

  it("opens the course's page for a missing course or lesson", () => {
    const link = { courseId: COURSE, kind: "lesson", lessonId: "gone" } as const;
    expect(appLinkPath(link, { course, currentPath: "/" })).toBe(`/courses/${COURSE}`);
    expect(appLinkPath(link, { course: null, currentPath: "/" })).toBe(`/courses/${COURSE}`);
  });

  it("opens Import on Home for an import link", () => {
    expect(appLinkPath({ code: "c0de", kind: "import" }, { course: null, currentPath: "/settings" })).toBe("/?import=c0de");
  });

  it("opens a program's or a channel's page", () => {
    expect(appLinkPath({ kind: "program", programId: COURSE }, { course: null, currentPath: "/" })).toBe(`/programs/${COURSE}`);
    expect(appLinkPath({ kind: "channel", programId: COURSE }, { course: null, currentPath: "/" })).toBe(`/channels/${COURSE}`);
  });

  it("finds the course of the open page", () => {
    expect(courseIdOfPath(`/courses/${COURSE}/lessons/x/test`)).toBe(COURSE);
    expect(courseIdOfPath(`/drafts/${COURSE}`)).toBe(COURSE);
    expect(courseIdOfPath("/courses/new")).toBeNull();
    expect(courseIdOfPath("/")).toBeNull();
  });
});

// SLJ-151: of links that arrive together, only the newest valid one opens.
describe("newestAppLink", () => {
  const code = "ybndrfg8ejkmcpqxot1uwisza345h769ybndrfg8ejkmcpqxot1u";

  it("takes the newest link and skips what isn't one", () => {
    expect(
      newestAppLink([
        { newTab: false, url: "matko://lesson/lesson-01" },
        { newTab: true, url: `matko://import/${code}` },
        { newTab: false, url: "matko://import/not-a-code" },
        { newTab: false, url: "https://example.com" },
      ]),
    ).toEqual({ link: { code, kind: "import" }, newTab: true });
  });

  it("is null for none, or none valid", () => {
    expect(newestAppLink([])).toBeNull();
    expect(newestAppLink([{ newTab: false, url: "matko://wipe/everything" }])).toBeNull();
  });
});

// Import accepts a code or a share link (SLJ-8).
describe("shareCodeFromText", () => {
  const code = "ybndrfg8ejkmcpqxot1uwisza345h769ybndrfg8ejkmcpqxot1u";

  it("takes a code, or the code in a share link", () => {
    expect(shareCodeFromText(code)).toBe(code);
    expect(shareCodeFromText(`  ${code.toUpperCase()}\n`)).toBe(code);
    expect(shareCodeFromText(`matko://import/${code}`)).toBe(code);
    expect(shareCodeFromText(` MATKO://import/${code} `)).toBe(code);
  });

  it("is null for anything else", () => {
    expect(shareCodeFromText("")).toBeNull();
    expect(shareCodeFromText("not a code")).toBeNull();
    expect(shareCodeFromText("matko://lesson/lesson-01")).toBeNull();
    expect(shareCodeFromText("matko://import/short")).toBeNull();
    expect(shareCodeFromText(`https://example.com/${code}`)).toBeNull();
  });
});
