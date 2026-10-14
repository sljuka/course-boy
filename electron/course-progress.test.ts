import { describe, expect, it } from 'vitest'

import type { CourseProgressState } from '../src/lib/course-progress'
import { createCourseProgress } from './course-progress'

function setup() {
  let state: CourseProgressState = { courses: {} }
  let clock = new Date('2026-10-07T10:00:00.000Z')
  const progress = createCourseProgress({
    now: () => clock,
    store: { read: () => state, write: (next) => (state = next) },
  })

  return {
    advance: (minutes: number) => (clock = new Date(clock.getTime() + minutes * 60_000)),
    progress,
    state: () => state,
  }
}

describe('course progress (SLJ-50)', () => {
  it('marks a course started the first time it is opened, and last opened every time', () => {
    const { advance, progress, state } = setup()

    progress.recordOpened('c1')
    advance(5)
    progress.recordOpened('c1')

    expect(state().courses.c1).toMatchObject({
      lastOpenedAt: '2026-10-07T10:05:00.000Z',
      startedAt: '2026-10-07T10:00:00.000Z',
    })
  })

  it('keeps the first date a lesson was done', () => {
    const { advance, progress, state } = setup()

    progress.recordStepDone('c1', 'lesson-01-intro')
    advance(5)
    progress.recordStepDone('c1', 'lesson-01-intro')

    expect(state().courses.c1.steps['lesson-01-intro'].doneAt).toBe('2026-10-07T10:00:00.000Z')
  })

  it('keeps the latest and the best test attempt, and counts attempts', () => {
    const { advance, progress, state } = setup()

    progress.recordTestResult('c1', 'test-01-intro', { correct: 6, longestStreak: 3, total: 10 })
    advance(5)
    progress.recordTestResult('c1', 'test-01-intro', { correct: 9, longestStreak: 7, total: 10 })
    advance(5)
    progress.recordTestResult('c1', 'test-01-intro', { correct: 4, longestStreak: 2, total: 10 })

    expect(state().courses.c1.steps['test-01-intro']).toEqual({
      doneAt: '2026-10-07T10:00:00.000Z',
      test: {
        attempts: 3,
        best: { at: '2026-10-07T10:05:00.000Z', correct: 9, longestStreak: 7, total: 10 },
        latest: { at: '2026-10-07T10:10:00.000Z', correct: 4, longestStreak: 2, total: 10 },
      },
    })
  })

  it('stars a program beside the courses, and forgets a removed one', () => {
    const { progress, state } = setup()

    progress.setProgramFavorite('p1', true)
    expect(state().programs?.p1).toEqual({ favorite: true, favoritedAt: '2026-10-07T10:00:00.000Z' })
    expect(state().courses).toEqual({})

    progress.setProgramFavorite('p1', false)
    expect(state().programs?.p1).toEqual({ favorite: false })

    progress.forgetProgram('p1')
    expect(state().programs).toEqual({})
  })

  it('sets a favorite, and forgets a removed course', () => {
    const { progress, state } = setup()

    progress.setFavorite('c1', true)
    progress.recordOpened('c2')

    expect(state().courses.c1).toMatchObject({ favorite: true, favoritedAt: '2026-10-07T10:00:00.000Z' })

    progress.setFavorite('c1', false)

    expect(state().courses.c1.favorite).toBe(false)
    expect(state().courses.c1.favoritedAt).toBeUndefined()

    progress.forgetCourse('c1')

    expect(Object.keys(state().courses)).toEqual(['c2'])
  })

  it('clears the progress of a course, keeping its star', () => {
    const { progress, state } = setup()

    progress.setFavorite('c1', true)
    progress.recordOpened('c1')
    progress.recordStepDone('c1', 'lesson-a')
    progress.recordTestResult('c1', 'test-a', { correct: 1, longestStreak: 1, total: 2 })
    progress.recordFirstTry('c1', true)
    progress.recordOpened('c2')

    progress.clearCourse('c1')
    progress.clearCourse('c2')
    progress.clearCourse('never-opened')

    expect(state().courses).toEqual({
      c1: { favorite: true, favoritedAt: '2026-10-07T10:00:00.000Z', steps: {} },
    })
  })

  it('keeps a spree per course (SLJ-134): right first tries in a row, and the best', () => {
    const { progress, state } = setup()

    expect(progress.recordFirstTry('c1', true)).toEqual({ best: 1, current: 1 })
    progress.recordFirstTry('c1', true)
    progress.recordFirstTry('c2', false)
    expect(progress.recordFirstTry('c1', false)).toEqual({ best: 2, current: 0 })
    progress.recordFirstTry('c1', true)

    expect(state().courses.c1.spree).toEqual({ best: 2, current: 1 })
    expect(state().courses.c2.spree).toEqual({ best: 0, current: 0 })
  })
})
