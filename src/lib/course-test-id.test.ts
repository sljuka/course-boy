import { describe, expect, it } from "vitest"

import { resolveLessonIdForTest, resolveTestIdForLesson } from "@/lib/course-test-id"

describe("resolveTestIdForLesson / resolveLessonIdForTest", () => {
  it("derives a test id from a lesson id", () => {
    expect(resolveTestIdForLesson("lesson-01-what-is-matko")).toBe("test-01-what-is-matko")
  })

  it("round-trips back to the original lesson id", () => {
    const lessonId = "lesson-02-onboarding"

    expect(resolveLessonIdForTest(resolveTestIdForLesson(lessonId))).toBe(lessonId)
  })
})
