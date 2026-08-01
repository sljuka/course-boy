import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCourseDetails, listCourses } from "./course-registry";

const coursesRoot = path.resolve(process.cwd(), "courses");

describe("listCourses", () => {
  it("returns the bundled getting started course", async () => {
    const courses = await listCourses(coursesRoot, "en");
    const gettingStartedCourse = courses.find(
      (course) => course.id === "matko-getting-started",
    );

    expect(courses).toHaveLength(1);
    expect(gettingStartedCourse?.lessonPreviews[0]?.title).toBe("What Matko Is");
    expect(gettingStartedCourse?.previewItems[0]).toMatchObject({
      id: "lesson-01-what-is-matko",
      kind: "lesson",
      title: "What Matko Is",
    });
    expect(gettingStartedCourse?.previewItems).toHaveLength(6);
  });
});

describe("getCourseDetails", () => {
  it("returns the configured entry section and section order", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "matko-getting-started",
      "en",
    );

    expect(course?.entrySectionId).toBe("section-01-welcome");
    expect(course?.sectionIds).toEqual([
      "section-01-welcome",
      "section-02-onboarding",
      "section-03-taking-a-course",
      "section-04-making-courses",
      "section-05-keys-and-identity",
      "section-06-sharing-courses",
      "section-07-safety-and-trust",
    ]);
  });

  it("returns localized section and lesson content for the bundled guide", async () => {
    const course = await getCourseDetails(
      coursesRoot,
      "matko-getting-started",
      "en",
    );

    expect(course?.sections[0]?.title).toBe("Welcome");
    expect(course?.sections[0]?.description).toBe(
      "What Matko is, who it is for, and how the app is organized.",
    );
    expect(course?.sections[0]?.lessons[0]?.body).toContain("# What Matko Is");
    expect(course?.sections[0]?.lessons[0]?.test).toBeNull();
  });
});
