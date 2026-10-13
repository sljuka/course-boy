// SLJ-128: an import waiting for someone who has the course survives a
// restart. A student imports a course while its teacher is offline, quits,
// starts again: the import is still under Downloading, and the course lands
// once the teacher is back online.

import { describe, expect, it } from 'vitest'
import { cutAndPublish, finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { close, launch } = sharingSuite('imports', {
  waitingStudent: 'waiting-student',
  waitingTeacher: 'waiting-teacher',
})

describe('imports that wait', () => {
  let code
  let courseId

  it('a teacher publishes a course, then goes offline', async () => {
    const teacher = await launch('waitingTeacher')
    await finishOnboarding(teacher, 'teacher')
    await setUpIdentity(teacher)
    const ids = await teacher.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Waiting Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    courseId = ids.courseId
    await writeLesson(teacher, ids, 'Worth the wait.')
    await cutAndPublish(teacher, courseId)
    code = (await waitForSharing(teacher, courseId, (info) => info.status === 'shared')).code
    await close('waitingTeacher')
  }, 120_000)

  it("a student's import waits through a restart, and lands once the teacher is back", async () => {
    let student = await launch('waitingStudent')
    await finishOnboarding(student, 'student')
    // Nobody has it online: the import waits (not awaited here).
    await student.evaluate((code) => {
      void window.sharing.importCourse({ code, transferId: 'waiting-import' })
    }, code)
    await expect.poll(() => student.evaluate(() => window.sharing.listImports())).toMatchObject([{ code, transferId: 'waiting-import' }])

    // Quit and start again: picked up again, and shown under Downloading.
    await close('waitingStudent')
    student = await launch('waitingStudent', { fresh: false })
    await expect
      .poll(() => student.evaluate(() => window.sharing.listImports()), { timeout: 30_000 })
      .toMatchObject([{ code, transferId: 'waiting-import' }])
    await student.evaluate(() => {
      location.hash = '#/'
    })
    await student.locator('[data-testid="home-group-downloading"] [data-testid="pending-import"]').waitFor({ timeout: 30_000 })

    // The teacher is back: it lands, and is no longer waiting.
    await launch('waitingTeacher', { fresh: false })
    await expect
      .poll(() => student.evaluate(() => window.courses.list('en')).then((courses) => courses.some((course) => course.id === courseId)), {
        interval: 1_000,
        timeout: 120_000,
      })
      .toBe(true)
    await expect.poll(() => student.evaluate(() => window.sharing.listImports()), { timeout: 30_000 }).toEqual([])
    await student.locator('[data-testid="home-group-downloading"]').waitFor({ state: 'detached', timeout: 30_000 })
  }, 300_000)
})
