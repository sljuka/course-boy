export function resolveTestIdForLesson(lessonId: string): string {
  return lessonId.replace(/^lesson-/, "test-");
}

export function resolveLessonIdForTest(testId: string): string {
  return testId.replace(/^test-/, "lesson-");
}
