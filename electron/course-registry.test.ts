import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCourseDetails, listCourses } from "./course-registry";

const coursesRoot = path.resolve(process.cwd(), "courses");

describe("listCourses", () => {
  it("returns localized lesson preview titles for Serbian", async () => {
    const courses = await listCourses(coursesRoot, "sr");
    const mathCourse = courses.find(
      (course) => course.id === "serbian-elementary-school-1st-grade-math",
    );

    expect(mathCourse?.lessonPreviews[0]?.title).toBe("Brojevi do 20");
  });

  it("returns localized lesson preview titles for Serbian Cyrillic", async () => {
    const courses = await listCourses(coursesRoot, "sr-Cyrl");
    const mathCourse = courses.find(
      (course) => course.id === "serbian-elementary-school-1st-grade-math",
    );

    expect(mathCourse?.lessonPreviews[0]?.title).toBe("Бројеви до 20");
  });
});

describe("getCourseDetails", () => {
  it("returns localized section metadata for Serbian", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "serbian-elementary-school-1st-grade-math",
      "sr",
    );

    expect(course?.sections[0]?.title).toBe("Osećaj za brojeve");
    expect(course?.sections[0]?.description).toBe(
      "Vežbaj brojanje, redosled i poređenje brojeva sa sigurnošću.",
    );
  });

  it("returns localized section metadata for Serbian Cyrillic", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "serbian-elementary-school-1st-grade-math",
      "sr-Cyrl",
    );

    expect(course?.sections[0]?.title).toBe("Осећај за бројеве");
    expect(course?.sections[0]?.description).toBe(
      "Вежбај бројање, редослед и поређење бројева са сигурношћу.",
    );
  });

  it("returns localized lesson body and exercise data", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "serbian-elementary-school-1st-grade-math",
      "en",
    );

    expect(course?.sections[0]?.lessons[0]?.body).toContain("# Numbers to 20");
    expect(course?.sections[0]?.lessons[0]?.exercise?.title).toBe(
      "Count the apples",
    );
    expect(course?.sections[0]?.lessons[0]?.exercise?.formula).toBe("a + b");
  });
});
