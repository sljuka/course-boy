// SLJ-128: an import waiting for someone who has the course survives a
// restart. A student imports a course while its teacher is offline, quits,
// starts again: the import is still under Downloading, and the course lands
// once the teacher is back online.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { cutAndPublish, finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { apps, close, data, launch } = sharingSuite('imports', {
  limitedStudent: 'limited-student',
  linkStudent: 'link-student',
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

  // SLJ-151: a code from a link is looked up, on the student's click, before
  // Import: what the course is and who published it. Nothing downloads.
  it("a link's code shows the course and its publisher before Import", async () => {
    const student = await launch('linkStudent')
    await finishOnboarding(student, 'student')
    const openUrl = (url) => apps.linkStudent.app.evaluate(({ app }, url) => app.emit('open-url', { preventDefault() {} }, url), url)

    await openUrl(`matko://import/${code}`)
    await student.locator('[data-testid="import-from-link"]').waitFor({ timeout: 20_000 })
    // A link's code waits for Find: nothing found, nothing to import yet.
    await student.locator('[data-testid="import-find"]').waitFor()
    expect(await student.locator('[data-testid="found-code"], [data-testid="import-confirm"]').count()).toBe(0)
    await student.locator('[data-testid="import-find"]').click()

    // Found: what it is and who published it (new to this student), what's in
    // it and how big, then "Import course".
    const card = student.locator('[data-testid="found-code"]')
    await card.waitFor({ timeout: 30_000 })
    expect(await card.locator('[data-testid="found-code-title"]').innerText()).toBe('E2E Waiting Course')
    expect(await card.locator('[data-testid="found-code-publisher"]').innerText()).toContain('E2E')
    expect(await card.locator('[data-testid="found-code-contents"]').innerText()).toBe('Sections: 1 · Lessons: 1 · Tests: 0')
    expect(await card.locator('[data-testid="found-code-size"]').innerText()).toMatch(/B · files: \d+$/)
    await card.locator('[data-testid="found-code-new-publisher"]').waitFor()
    expect(await student.locator('[data-testid="import-confirm"]').innerText()).toBe('Import course')
    expect(await student.evaluate(() => window.sharing.listImports())).toEqual([])

    // A code nobody shares: it says so, and can still be imported.
    const unknownCode = 'ybndrfg8ejkmcpqxot1uwisza345h769ybndrfg8ejkmcpqxot1u'
    await openUrl(`matko://import/${unknownCode}`)
    await expect.poll(() => student.locator('[data-testid="import-course-code"]').inputValue()).toBe(unknownCode)
    await student.locator('[data-testid="import-find"]').click()
    await student.locator('[data-testid="found-code-nobody-online"]').waitFor({ timeout: 40_000 })
    expect(await student.locator('[data-testid="import-confirm"]').innerText()).toBe('Import anyway')
    expect(await student.evaluate(() => window.sharing.listImports())).toEqual([])
  }, 120_000)

  // SLJ-153: a download over a limit is refused before anything of it is
  // written, and the student is told why in their own words. Here the limit
  // is 2 files (test-only, MATKO_DOWNLOAD_LIMITS) and the course has more.
  it('refuses a course over the download limits, leaving nothing on disk', async () => {
    const student = await launch('limitedStudent', { extraEnv: { MATKO_DOWNLOAD_LIMITS: JSON.stringify({ maxFiles: 2 }) } })
    await finishOnboarding(student, 'student')
    await student.locator('[data-testid="home-import-course"], button:has-text("Import course")').first().click()
    // A pasted share link (its code is used) is found on its own: over the
    // limit, it says so, and there's nothing to import.
    await student.locator('[data-testid="import-course-code"]').fill(`matko://import/${code}`)
    const overLimit = student.locator('[data-testid="found-code-over-limit"]')
    await overLimit.waitFor({ timeout: 60_000 })
    expect(await overLimit.innerText()).toContain('This course has too many files to download')
    expect(await student.locator('[data-testid="import-confirm"]').count()).toBe(0)

    // And the download itself is refused too, past the dialog.
    const refused = await student.evaluate(
      (code) => window.sharing.importCourse({ code, transferId: 'over-limit' }).then(() => 'imported', (error) => error.message),
      code,
    )
    expect(refused).toContain('TOO_MANY_FILES')
    // Not imported, and nothing left of it: no course, no staging folder.
    expect(await student.evaluate(() => window.courses.list('en')).then((courses) => courses.some((course) => course.id === courseId))).toBe(false)
    const coursesRoot = path.join(data.limitedStudent, 'courses')
    const leftovers = fs.existsSync(coursesRoot)
      ? fs.readdirSync(coursesRoot).filter((name) => name === courseId || name.startsWith('.staging') || name.includes('staging'))
      : []
    expect(leftovers).toEqual([])
  }, 120_000)
})
