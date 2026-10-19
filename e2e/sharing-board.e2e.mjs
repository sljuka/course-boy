// SLJ-149 phase 1: a course's board between a teacher and two students, each
// its own app on the file's local testnet. Off until the teacher turns it on;
// then students post, everyone gets the messages, and the teacher hides a
// message and blocks a sender, which every device follows.

import { describe, expect, it } from 'vitest'
import {
  cutAndPublish,
  finishOnboarding,
  importCourse,
  setUpIdentity,
  sharingSuite,
  unlockIdentity,
  waitForSharing,
  writeLesson,
} from './sharing-suite.mjs'

const { apps, close, launch } = sharingSuite('board', {
  student1: 'student-1',
  student2: 'student-2',
  teacher: 'teacher',
})

const board = (page, courseId) => page.evaluate((id) => window.boards.get(id), courseId)
const texts = async (page, courseId) => {
  const current = await board(page, courseId)
  return current.status === 'on' ? current.messages.map((message) => message.text) : null
}

async function openCoursePage(page, courseId) {
  await page.evaluate((id) => {
    location.hash = `#/courses/${id}`
  }, courseId)
  await page.locator('[data-testid="course-actions-menu"]').waitFor()
}

describe('a course board', () => {
  let ids
  let code

  it('a teacher publishes a course and two students import it; its board is off', async () => {
    const teacher = await launch('teacher')
    await finishOnboarding(teacher, 'teacher')
    await setUpIdentity(teacher)
    ids = await teacher.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Board Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(teacher, ids, 'Hello.')
    await cutAndPublish(teacher, ids.courseId)
    code = (await waitForSharing(teacher, ids.courseId, (info) => info.status === 'shared')).code
    await expect.poll(() => board(teacher, ids.courseId), { timeout: 15_000 }).toEqual({ isTeacher: true, status: 'off' })

    for (const name of ['student1', 'student2']) {
      const page = await launch(name)
      await finishOnboarding(page, 'student')
      expect(await importCourse(page, code)).toEqual({ courseId: ids.courseId })
      await expect.poll(() => board(page, ids.courseId), { timeout: 15_000 }).toEqual({ isTeacher: false, status: 'off' })
    }
    // No tabs while it's off.
    await openCoursePage(apps.student1.page, ids.courseId)
    expect(await apps.student1.page.locator('[data-testid="course-tab-board"]').count()).toBe(0)
  })

  it('the teacher turns it on in the course form; a student posts and everyone gets it', async () => {
    const teacher = apps.teacher.page
    await teacher.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    // In the course form's "Course board" accordion, closed while it's off.
    await teacher.click('[data-testid="course-board-toggle"]')
    await teacher.locator('[data-testid="board-enabled"]').click()
    await expect.poll(async () => (await board(teacher, ids.courseId)).status).toBe('on')
    // "Open the board" switches the editor to its Board tab.
    await teacher.click('[data-testid="board-open"]')
    await teacher.locator('[data-testid="board-composer"]').waitFor()

    const student1 = apps.student1.page
    await student1.locator('[data-testid="course-tab-board"]').waitFor({ timeout: 30_000 })
    await student1.click('[data-testid="course-tab-board"]')
    await student1.locator('[data-testid="board-composer"]').fill('Is lesson 2 on the test?')
    await student1.click('[data-testid="board-post"]')
    await student1.locator('[data-testid="board-message"]', { hasText: 'Is lesson 2 on the test?' }).waitFor()

    await expect.poll(() => texts(teacher, ids.courseId), { timeout: 30_000 }).toEqual(['Is lesson 2 on the test?'])
    await expect.poll(() => texts(apps.student2.page, ids.courseId), { timeout: 30_000 }).toEqual(['Is lesson 2 on the test?'])
    // Unread for student 2, on the course page's tab.
    expect(await board(apps.student2.page, ids.courseId)).toMatchObject({ unread: 1 })

    // The teacher's answer carries the badge on the students' devices.
    await teacher.evaluate((id) => window.boards.post(id, 'Yes, it is.'), ids.courseId)
    await expect
      .poll(async () => {
        const current = await board(student1, ids.courseId)
        return current.status === 'on' ? current.messages.find((message) => message.text === 'Yes, it is.')?.isTeacher : null
      }, { timeout: 30_000 })
      .toBe(true)
  })

  it("the course form opens the board's accordion while it's on", async () => {
    const teacher = apps.teacher.page
    await teacher.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await teacher.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await teacher.locator('[data-testid="board-student-limit"]').waitFor()
  })

  it('the teacher hides a message from its menu and blocks a sender; every device follows', async () => {
    const teacher = apps.teacher.page
    const student2 = apps.student2.page
    await student2.evaluate((id) => window.boards.post(id, 'Spam spam spam'), ids.courseId)
    await expect.poll(() => texts(teacher, ids.courseId), { timeout: 30_000 }).toContain('Spam spam spam')

    // The teacher's board is in the editor: Course | Board in its action bar.
    await teacher.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await teacher.click('[data-testid="course-tab-board"]')
    const original = teacher.locator('[data-testid="board-message"]', { hasText: 'Is lesson 2 on the test?' })
    await original.locator('[data-testid="board-message-menu"]').click()
    await teacher.click('[data-testid="board-hide"]')
    await teacher.locator('[data-testid="board-undo"]').waitFor()
    await expect.poll(() => texts(apps.student1.page, ids.courseId), { timeout: 30_000 }).not.toContain('Is lesson 2 on the test?')

    const spam = teacher.locator('[data-testid="board-message"]', { hasText: 'Spam spam spam' })
    await spam.locator('[data-testid="board-message-menu"]').click()
    await teacher.click('[data-testid="board-block"]')
    await expect.poll(() => texts(apps.student1.page, ids.courseId), { timeout: 30_000 }).toEqual(['Yes, it is.'])
    // The blocked sender's device has the list too and refuses their next post.
    await expect
      .poll(() => student2.evaluate((id) => window.boards.post(id, 'More spam').then(() => 'sent', (error) => error.message), ids.courseId), {
        timeout: 30_000,
      })
      .toMatch(/blocked/)
  })

  // Unlocking at startup opens the teacher's boards (it once checked too
  // early, while main still counted the identity as locked).
  it("after a restart and the password, the teacher's board is theirs again", async () => {
    await close('teacher')
    const teacher = await launch('teacher', { fresh: false })
    await teacher.locator('[data-testid="publisher-password-gate"]').waitFor()
    await unlockIdentity(teacher)
    await expect
      .poll(async () => {
        const current = await board(teacher, ids.courseId)
        return current.status === 'on' && current.isTeacher
      }, { timeout: 30_000 })
      .toBe(true)
  })

  it('a student switches the board off for this course on their device', async () => {
    const student1 = apps.student1.page
    await openCoursePage(student1, ids.courseId)
    await student1.click('[data-testid="course-actions-menu"]')
    await student1.click('[data-testid="board-shown-toggle"]')
    await expect.poll(() => board(student1, ids.courseId)).toEqual({ status: 'hidden' })
    await student1.keyboard.press('Escape')
    await expect.poll(() => student1.locator('[data-testid="course-tab-board"]').count()).toBe(0)
  })
})
