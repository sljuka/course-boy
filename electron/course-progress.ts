import {
  type CourseProgress,
  type CourseProgressState,
  isBetterAttempt,
  type TestAttemptResult,
} from '../src/lib/course-progress'

// A student's progress through their courses (SLJ-50): the only code that
// reads or writes `course-progress.json` (see src/lib/course-progress.ts for
// what's kept and why there). Kept to this narrow API so the file could be
// swapped for a database later without touching anything else.

export type CourseProgressStore = {
  read(): CourseProgressState
  write(state: CourseProgressState): void
}

export function createCourseProgress({ now = () => new Date(), store }: { now?: () => Date; store: CourseProgressStore }) {
  function update(courseId: string, change: (course: CourseProgress) => CourseProgress) {
    const state = store.read()
    const course = state.courses[courseId] ?? { steps: {} }

    store.write({ ...state, courses: { ...state.courses, [courseId]: change(course) } })
  }

  return {
    read(): CourseProgressState {
      return store.read()
    },

    // The student opened one of the course's lessons or tests: it's started
    // (the first time) and was last opened now.
    recordOpened(courseId: string) {
      const at = now().toISOString()

      update(courseId, (course) => ({ ...course, lastOpenedAt: at, startedAt: course.startedAt ?? at }))
    },

    // The student moved past a lesson with Continue. Done stays done: going
    // through it again doesn't move the date.
    recordStepDone(courseId: string, stepId: string) {
      const at = now().toISOString()

      update(courseId, (course) => ({
        ...course,
        steps: { ...course.steps, [stepId]: { ...course.steps[stepId], doneAt: course.steps[stepId]?.doneAt ?? at } },
      }))
    },

    // The student finished a test (moved past it with Continue): it's done,
    // and this attempt becomes the latest, and the best if it beats it.
    recordTestResult(courseId: string, stepId: string, result: TestAttemptResult) {
      const attempt = { ...result, at: now().toISOString() }

      update(courseId, (course) => {
        const step = course.steps[stepId]
        const previous = step?.test

        return {
          ...course,
          steps: {
            ...course.steps,
            [stepId]: {
              ...step,
              doneAt: step?.doneAt ?? attempt.at,
              test: {
                attempts: (previous?.attempts ?? 0) + 1,
                best: previous && !isBetterAttempt(attempt, previous.best) ? previous.best : attempt,
                latest: attempt,
              },
            },
          },
        }
      })
    },

    // Starred (with when, for the sidebar's order) or not.
    setFavorite(courseId: string, favorite: boolean) {
      const at = now().toISOString()

      update(courseId, ({ favoritedAt: _favoritedAt, ...course }) =>
        favorite ? { ...course, favorite, favoritedAt: _favoritedAt ?? at } : { ...course, favorite },
      )
    },

    // The course was removed: its progress goes with it.
    forgetCourse(courseId: string) {
      const state = store.read()

      if (!(courseId in state.courses)) return
      const courses = { ...state.courses }
      delete courses[courseId]
      store.write({ ...state, courses })
    },
  }
}

export type CourseProgressService = ReturnType<typeof createCourseProgress>
