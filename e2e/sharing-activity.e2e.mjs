// SLJ-168: course activity between a teacher and two students, each its own
// app on the file's local testnet. The students' devices work events out
// from their progress and send them (no delay here: MATKO_ACTIVITY_DELAY_MS);
// the teacher's device counts them, in the editor's Activity tab and on the
// Activity page. A student who turns sharing off sends nothing.

import { describe, expect, it } from 'vitest'
import {
  cutAndPublish,
  finishOnboarding,
  importCourse,
  setUpIdentity,
  sharingSuite,
  waitForSharing,
  writeLesson,
} from './sharing-suite.mjs'

const { apps, launch } = sharingSuite('activity', {
  student1: 'student-1',
  student2: 'student-2',
  teacher: 'teacher',
})

const noDelay = { MATKO_ACTIVITY_DELAY_MS: '0' }
const activity = (page, courseId) => page.evaluate((id) => window.activity.get(id), courseId)

describe('course activity', () => {
  let ids

  it('two students import a published course', async () => {
    const teacher = await launch('teacher')
    await finishOnboarding(teacher, 'teacher')
    await setUpIdentity(teacher)
    ids = await teacher.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Activity Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(teacher, ids, 'Hello.')
    await cutAndPublish(teacher, ids.courseId)
    const { code } = await waitForSharing(teacher, ids.courseId, (info) => info.status === 'shared')
    await expect.poll(() => activity(teacher, ids.courseId), { timeout: 15_000 }).toMatchObject({ collect: true, status: 'ready' })

    for (const name of ['student1', 'student2']) {
      const page = await launch(name, { extraEnv: noDelay })
      await finishOnboarding(page, 'student')
      expect(await importCourse(page, code)).toEqual({ courseId: ids.courseId })
      // Students see no activity of their own course.
      expect(await activity(page, ids.courseId)).toEqual({ status: 'unavailable' })
    }
    await expect
      .poll(async () => (await activity(teacher, ids.courseId)).summary?.imported, { timeout: 30_000 })
      .toBe(2)
  })

  it("one finishes the course, the other turns sharing off; the teacher's Activity tab counts the first", async () => {
    const student2 = apps.student2.page
    await student2.evaluate(() => {
      location.hash = '#/settings'
    })
    await student2.click('[data-testid="settings-share-activity"]')
    await expect.poll(() => student2.evaluate(() => window.activity.getSettings())).toEqual({ enabled: false })

    for (const page of [apps.student1.page, student2]) {
      await page.evaluate(async ({ courseId, lessonId }) => {
        await window.progress.recordOpened(courseId)
        await window.progress.recordStepDone({ courseId, stepId: lessonId })
        await window.progress.recordReachedEnd(courseId)
      }, ids)
    }

    const teacher = apps.teacher.page
    await expect
      .poll(async () => (await activity(teacher, ids.courseId)).summary, { timeout: 30_000 })
      .toEqual({
        finished: [1],
        imported: 2,
        reachedEnd: [{ '25-49': 0, '50-74': 0, '75-99': 0, all: 1, 'under-25': 0 }],
        sections: { [ids.sectionId]: [1] },
        started: 1,
      })

    // Course | Activity in the editor's action bar (the board is off).
    await teacher.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await teacher.click('[data-testid="course-tab-activity"]')
    await expect.poll(() => teacher.locator('[data-testid="activity-finished"]').textContent()).toContain('≈ 1')
    await expect.poll(() => teacher.locator('[data-testid="activity-section"]').count()).toBe(1)
    expect(await teacher.locator('[data-testid="course-tab-board"]').count()).toBe(0)

    // And on the Activity page, opening the course's tab. (Reloaded first:
    // the course was made through the bridge, so the window's list of
    // courses is from before it.)
    await teacher.evaluate(() => {
      location.hash = '#/activity'
      location.reload()
    })
    await teacher.click('[data-testid="activity-course-row"] a')
    await teacher.locator('[data-testid="course-activity"]').waitFor()
  })

  it('the teacher stops collecting in the course form; the tab says so', async () => {
    const teacher = apps.teacher.page
    await teacher.click('[data-testid="course-tab-course"]')
    await teacher.locator('[data-testid="course-activity-collect"]').click()
    await expect.poll(async () => (await activity(teacher, ids.courseId)).collect).toBe(false)
    await teacher.click('[data-testid="course-tab-activity"]')
    await teacher.locator('[data-testid="course-activity-off"]').waitFor()
  })
})
