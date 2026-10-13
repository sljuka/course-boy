// SLJ-32: programs online: publish, import, follow, New markers, stars.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { bodyText, waitFor, waitForText } from './launch.mjs'
import { finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { apps, launch } = sharingSuite('programs', {
  curator: 'curator',
  programStudent: 'program-student',
})

// SLJ-32 phase 2: a program online. The curator publishes a program (its own
// code); a student imports it with the same Import box as a course, imports
// its courses from its page, and gets the curator's later changes on their
// own, with the added course marked New.
describe('programs online', () => {
  let programId
  let programCode
  let first
  let second

  async function createPublishedCourse(page, title, { publish = true } = {}) {
    const ids = await page.evaluate(async (title) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: `About ${title}`, title } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    }, title)
    await writeLesson(page, ids, `${title} lesson.`)
    const { version } = await page.evaluate((courseId) => window.courses.cutVersion({ courseId, releaseType: 'minor' }), ids.courseId)
    if (!publish) return { courseId: ids.courseId, title, version }
    await page.evaluate(({ courseId, version }) => window.courses.publishVersion({ courseId, version }), { courseId: ids.courseId, version })
    const { code } = await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')
    return { code, courseId: ids.courseId, title, version }
  }

  const entry = (course) => ({
    code: course.code ?? null,
    courseId: course.courseId,
    snapshot: {
      locales: { en: { description: `About ${course.title}`, title: course.title } },
      publisherId: null,
      supportedLocales: ['en'],
      version: course.version,
    },
  })

  async function openProgramPage(page) {
    await page.evaluate((id) => {
      location.hash = `#/programs/${id}`
    }, programId)
    await page.locator('[data-testid="program-page"]').waitFor()
  }

  it('the curator publishes a program from its editor and gets its code', async () => {
    const page = await launch('curator')
    await finishOnboarding(page, 'teacher')
    await setUpIdentity(page)
    first = await createPublishedCourse(page, 'E2E Program Course One')
    // Added before it's published: no code yet in the program.
    second = await createPublishedCourse(page, 'E2E Program Course Two', { publish: false })

    programId = (await page.evaluate(() => window.programs.create({ locale: 'en', title: 'E2E Program' }))).programId
    const program = await page.evaluate((id) => window.programs.get(id), programId)
    await page.evaluate((manifest) => window.programs.update(manifest), {
      ...program,
      courses: [entry(first), entry(second)],
    })

    await page.evaluate((id) => {
      location.hash = `#/my-programs/${id}`
    }, programId)
    await page.click('[data-testid="program-publish"]')
    await waitFor(page, () => Boolean(document.querySelector('[data-testid="program-code"]')?.value), { timeout: 30_000 })
    programCode = await page.inputValue('[data-testid="program-code"]')
    expect(programCode).toMatch(/^[a-z0-9]{52}$/)
    await page.getByRole('button', { name: 'Done' }).click()

    // Its code never changes, and differs from its courses'.
    expect(await page.evaluate((id) => window.programs.publish(id), programId)).toEqual({ code: programCode })
    expect(programCode).not.toBe(first.code)
  })

  it("a student imports the program with Home's Import box, then a course from its page", async () => {
    const page = await launch('programStudent')
    await finishOnboarding(page, 'student')
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await page.getByRole('button', { name: 'Import course' }).first().click()
    await page.getByLabel('Course or program code').fill(programCode)
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    await waitFor(page, () => document.querySelector('[data-testid="home-group-programs"]')?.textContent?.includes('E2E Program'), {
      timeout: 60_000,
    }).catch(async (error) => {
      console.log('[programs e2e] Home:', await bodyText(page))
      throw error
    })
    // Nothing is new in a program just imported, and nothing in it is started.
    expect(await page.locator('[data-testid="home-program-new"]').count()).toBe(0)
    expect(await page.locator('[data-testid="home-program"] [data-testid="program-progress-icon"]').getAttribute('data-status')).toBe('not-started')

    await page.locator('[data-testid="home-program"] a').first().click()
    await page.locator('[data-testid="program-page"]').waitFor()
    const rows = page.locator('[data-testid="program-course"]')
    expect(await rows.count()).toBe(2)
    // SLJ-126: who curated it, and who published each course (the curator's
    // own, credited when the program was published), by Publisher ID.
    const curatorId = await apps.curator.page.evaluate(() => window.sharing.getCreatorKey())
    await waitFor(page, (prefix) => document.querySelector('[data-testid="program-curator"]')?.textContent?.includes(prefix), {
      arg: curatorId.slice(0, 8),
      timeout: 30_000,
    })
    expect(await rows.nth(0).locator('[data-testid="program-course-publisher"]').getAttribute('title')).toBe(curatorId)
    // The second course wasn't published when the program was.
    expect(await rows.nth(1).locator('[data-testid="program-course-missing"]').count()).toBe(1)

    // SLJ-127: the curator is online with the first course, so it can be
    // downloaded now; the page says how many of its courses can.
    await waitFor(
      page,
      () => document.querySelector('[data-testid="program-course"] [data-testid="program-course-availability"]')?.getAttribute('data-state') === 'available',
      { timeout: 60_000 },
    )
    await page.locator('[data-testid="program-availability"]').waitFor({ timeout: 30_000 })
    await rows.nth(0).locator('[data-testid="program-course-import"]').click()
    await waitFor(page, () => document.querySelector('[data-testid="program-course"] a')?.textContent?.includes('E2E Program Course One'), {
      timeout: 30_000,
    })
    // The page offers the program's code to pass on.
    await page.click('[data-testid="program-share"]')
    await waitFor(page, () => Boolean(document.querySelector('[data-testid="program-code"]')?.value))
    expect(await page.inputValue('[data-testid="program-code"]')).toBe(programCode)
    await page.getByRole('button', { name: 'Done' }).click()
  })

  it("a course is looked up by its code without importing it (a curator adding someone else's course)", async () => {
    const curator = apps.curator.page
    await curator.evaluate(
      ({ courseId, version }) => window.courses.publishVersion({ courseId, version }),
      second,
    )
    second.code = (await waitForSharing(curator, second.courseId, (info) => info.status === 'shared')).code

    const student = apps.programStudent.page
    const peeked = await student.evaluate((code) => window.programs.peekCourse(code), second.code)
    expect(peeked.course).toMatchObject({ code: second.code, courseId: second.courseId })
    expect(peeked.course.snapshot.locales.en.title).toBe('E2E Program Course Two')
    // Credited to its publisher, with the name their channel gives them (their nickname).
    expect(peeked.course.snapshot).toMatchObject({
      publisherId: await curator.evaluate(() => window.sharing.getCreatorKey()),
      publisherName: 'E2E',
    })
    expect((await student.evaluate(() => window.courses.list('en'))).some((course) => course.id === second.courseId)).toBe(false)

    // In the editor: a course already in the program is refused by name.
    await curator.evaluate((id) => {
      location.hash = `#/my-programs/${id}`
    }, programId)
    await curator.fill('[data-testid="program-add-by-code"]', first.code)
    await curator.click('[data-testid="program-add-by-code-submit"]')
    await waitForText(curator, 'This course is already in the program.', { timeout: 30_000 })
  })

  it("the curator's change reaches the student on its own, the added course marked New until seen", async () => {
    const curator = apps.curator.page
    const third = await createPublishedCourse(curator, 'E2E Program Course Three')
    const program = await curator.evaluate((id) => window.programs.get(id), programId)
    await curator.evaluate((manifest) => window.programs.update(manifest), {
      ...program,
      courses: [...program.courses, entry(third)],
    })
    expect(await curator.evaluate((id) => window.programs.publish(id), programId)).toEqual({ code: programCode })
    // Publishing filled in the code of the course published since it was added.
    const published = await curator.evaluate((id) => window.programs.get(id), programId)
    expect(published.courses[1].code).toBe(second.code)

    const student = apps.programStudent.page
    await expect
      .poll(() => student.evaluate((id) => window.programs.get(id).then((p) => p.courses.length), programId), {
        interval: 500,
        timeout: 30_000,
      })
      .toBe(3)
    expect(await student.evaluate((id) => window.programs.get(id).then((p) => p.courses[1].code), programId)).toBe(second.code)

    await student.evaluate(() => {
      location.hash = '#/'
    })
    await waitFor(student, () => document.querySelector('[data-testid="home-program-new"]') !== null, { timeout: 40_000 })

    await openProgramPage(student)
    const rows = student.locator('[data-testid="program-course"]')
    await waitFor(student, () => document.querySelectorAll('[data-testid="program-course-new"]').length === 1)
    expect(await rows.nth(2).locator('[data-testid="program-course-new"]').count()).toBe(1)

    // Import all gets the two courses not on this device yet.
    await student.click('[data-testid="program-import-all"]')
    await waitFor(
      student,
      () => document.querySelectorAll('[data-testid="program-course"] a').length === 3,
      { timeout: 60_000 },
    )

    // Seen: no longer new on Home.
    await student.evaluate(() => {
      location.hash = '#/'
    })
    await student.locator('[data-testid="home-program"]').waitFor()
    await expect.poll(() => student.locator('[data-testid="home-program-new"]').count(), { timeout: 10_000 }).toBe(0)

    // Starred from its Home row: in the sidebar's Favorites, and kept by `:favorites`.
    await student.locator('[data-testid="home-program"] [data-testid="program-favorite"]').click()
    await waitFor(student, () => document.querySelector('[data-testid="sidebar-favorites"]')?.textContent?.includes('E2E Program'))
    await student.fill('[data-testid="course-search"]', ':favorites')
    await student.locator('[data-testid="home-program"]').waitFor()
    // Unstarred by its crumb on its page: gone from the sidebar again.
    await openProgramPage(student)
    await student.locator('[data-testid="program-favorite"]').click()
    await waitFor(student, () => document.querySelector('[data-testid="sidebar-favorites"]') === null)
  })
})

// SLJ-11, milestone 3: Ana invites Marko to maintain her course (both must
// approve each version). The course moves to a shared code; students follow.
