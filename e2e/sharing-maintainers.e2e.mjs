// SLJ-11: a course maintained by two teachers (approval with multisig), its
// students following it to its shared code, and restoring on new computers.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor, waitForText } from './launch.mjs'
import { IDENTITY_PASSWORD, currentVersionFiles, cutAndPublish, finishOnboarding, importCourse, setUpIdentity, sharingSuite, waitForSharing, waitForUpdate, writeLesson } from './sharing-suite.mjs'

const { ROOT, apps, close, data, identityFilePath, launch } = sharingSuite('maintainers', {
  coOwner: 'co-owner',
  coMaintainer: 'co-maintainer',
  coStudent: 'co-student',
  coLateStudent: 'co-late-student',
  coOwnerNew: 'co-owner-new',
  coMaintainerNew: 'co-maintainer-new',
})

// SLJ-11, milestone 3: Ana invites Marko to maintain her course (both must
// approve each version). The course moves to a shared code; students follow.
describe('a course maintained by two teachers', () => {
  let ids
  let oldCode
  let sharedKey

  it('Ana publishes, a student imports, and Marko joins with her invite', async () => {
    const ana = await launch('coOwner')
    await finishOnboarding(ana, 'teacher')
    await setUpIdentity(ana)
    fs.copyFileSync(identityFilePath('coOwner'), path.join(ROOT, 'co-owner.matko-identity'))
    ids = await ana.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Co-maintained Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(ana, ids, 'First version.')
    await cutAndPublish(ana, ids.courseId)
    oldCode = (await waitForSharing(ana, ids.courseId, (info) => info.status === 'shared')).code

    const student = await launch('coStudent')
    await finishOnboarding(student, 'student')
    expect(await importCourse(student, oldCode)).toEqual({ courseId: ids.courseId })

    const marko = await launch('coMaintainer')
    await finishOnboarding(marko, 'teacher')
    await setUpIdentity(marko)
    fs.copyFileSync(identityFilePath('coMaintainer'), path.join(ROOT, 'co-maintainer.matko-identity'))

    // Ana invites from the course editor's Maintainers panel.
    await ana.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await ana.click('[data-testid="invite-maintainer"]')
    await waitFor(ana, () => Boolean(document.querySelector('[data-testid="maintainer-invite-code"]')?.value))
    const code = await ana.inputValue('[data-testid="maintainer-invite-code"]')
    await ana.getByRole('button', { name: 'Done' }).click()

    // Marko joins from My courses.
    await marko.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await marko.click('[data-testid="open-join-course"]')
    await marko.fill('[data-testid="maintainer-join-code"]', code)
    await marko.click('[data-testid="maintainer-join"]')
    await waitForText(marko, "You've joined.", { timeout: 30_000 })
    await marko.getByRole('button', { name: 'Done' }).click()
    await expect
      .poll(() => ana.evaluate((id) => window.maintainers.get(id).then((info) => info?.members.length), ids.courseId), {
        interval: 500,
        timeout: 30_000,
      })
      .toBe(2)
  }, 180_000)

  it('Ana starts sharing; Marko reviews and approves; the course moves and students follow', async () => {
    const ana = apps.coOwner.page
    const marko = apps.coMaintainer.page
    const student = apps.coStudent.page
    // Both maintainers listed; Ana starts, with "Both of you" (the only rule for two).
    await waitFor(ana, () => document.querySelectorAll('[data-testid="maintainer"]').length === 2, { timeout: 30_000 })
    await ana.click('[data-testid="open-start-sharing"]')
    await waitForText(ana, 'Both of you')
    await ana.click('[data-testid="start-sharing"]')
    await waitFor(ana, () => document.querySelector('[data-testid="maintainers-waiting"]') !== null, { timeout: 30_000 })

    // Marko: Approvals in the sidebar, the review, Approve.
    await marko.locator('[data-testid="sidebar-approvals"] a').waitFor({ timeout: 30_000 })
    await marko.locator('[data-testid="sidebar-approvals"] a').click()
    // Named by the course's title, though the course isn't on Marko's computer yet.
    await waitForText(marko, 'E2E Co-maintained Course')
    await marko.locator('[data-testid="approval"] a').first().click()
    await waitFor(marko, () => document.querySelectorAll('[data-testid="approval-changes"] > *').length > 0, { timeout: 30_000 })
    expect(await marko.locator('[data-testid="approval-changes"]').innerText()).not.toContain('version-meta.json')
    await marko.click('[data-testid="approve-version"]')
    await waitForText(marko, 'Nothing is waiting for your approval.', { timeout: 30_000 })

    // Ana's app collects the approval and puts the shared course online.
    await expect
      .poll(() => ana.evaluate((id) => window.maintainers.get(id).then((info) => info?.sharedKey ?? null), ids.courseId), {
        interval: 500,
        timeout: 60_000,
      })
      .not.toBeNull()
    sharedKey = await ana.evaluate((id) => window.maintainers.get(id).then((info) => info.sharedKey), ids.courseId)
    expect(sharedKey).not.toBe(oldCode)

    // The student's app follows it to the new code.
    await expect
      .poll(() => student.evaluate((id) => window.sharing.getCourseSharing(id).then((info) => info.code), ids.courseId), {
        interval: 500,
        timeout: 60_000,
      })
      .toBe(sharedKey)

    // Marko's app lands the course as his own, shared.
    await expect
      .poll(() => marko.evaluate((id) => window.maintainers.get(id).then((info) => info?.sharedKey ?? null), ids.courseId), {
        interval: 500,
        timeout: 60_000,
      })
      .toBe(sharedKey)
    const markoCourse = (await marko.evaluate(() => window.courses.list('en'))).find((course) => course.id === ids.courseId)
    expect(markoCourse).toMatchObject({ distribution: 'local', title: 'E2E Co-maintained Course' })
  }, 180_000)

  it("Marko publishes a new version; it goes online only after Ana approves, and the student is offered it", async () => {
    const ana = apps.coOwner.page
    const marko = apps.coMaintainer.page
    const student = apps.coStudent.page
    await writeLesson(marko, ids, 'Second version, by Marko.')
    // Cut, then Publish from the editor: for a shared course it asks for approval.
    const { version } = await marko.evaluate(
      (courseId) => window.courses.cutVersion({ courseId, releaseType: 'minor' }),
      ids.courseId,
    )
    await marko.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await marko.click('[data-testid="publish-course"]')
    await waitForText(marko, `Version ${version} sent for approval`, { timeout: 30_000 })
    await marko.getByRole('button', { name: 'Done' }).click()

    const [item] = await expect
      .poll(() => ana.evaluate(() => window.maintainers.listApprovals()), { interval: 500, timeout: 60_000 })
      .toHaveLength(1)
      .then(() => ana.evaluate(() => window.maintainers.listApprovals()))
    expect(item.version).toBe(version)
    // Not online before the approval.
    expect((await student.evaluate((id) => window.sharing.getCourseSharing(id), ids.courseId)).update).toBeNull()

    await ana.evaluate((input) => window.maintainers.approve(input), { hash: item.hash, publicId: item.publicId })
    await waitForUpdate(student, ids.courseId, (update) => update.version === version, 60_000)
    expect(await student.evaluate((id) => window.sharing.applyCourseUpdate(id), ids.courseId)).toMatchObject({ version })
    const lesson = currentVersionFiles(data.coStudent, ids.courseId).find(({ file }) => file.endsWith('.md'))
    expect(fs.readFileSync(lesson.path, 'utf8')).toContain('Second version, by Marko.')
  }, 180_000)

  it("a student who only has the old code gets the shared course", async () => {
    const late = await launch('coLateStudent')
    await finishOnboarding(late, 'student')
    expect(await importCourse(late, oldCode)).toEqual({ courseId: ids.courseId })
    expect((await late.evaluate((id) => window.sharing.getCourseSharing(id), ids.courseId)).code).toBe(sharedKey)
  }, 120_000)

  // A teacher's new computer: the identity restored from a copy of its file.
  async function restoreOn(name, backupFile) {
    const page = await launch(name, { extraEnv: { MATKO_RESTORE_GAP_LIMIT: '3' } })
    await apps[name].app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, path.join(ROOT, backupFile))
    await finishOnboarding(page, 'teacher')
    await page.evaluate(() => window.sharing.chooseIdentityFile())
    expect(await page.evaluate((password) => window.sharing.restoreIdentity(password), IDENTITY_PASSWORD)).toEqual({ restored: true })
    return page
  }

  it("Ana's new computer finds the course, follows it to the shared course, and takes it up as owner", async () => {
    await close('coOwner')
    const ana = await restoreOn('coOwnerNew', 'co-owner.matko-identity')
    await expect
      // Finding the course, following its notice and downloading the shared
      // course each wait for peers: this takes a while.
      .poll(() => ana.evaluate((id) => window.maintainers.get(id), ids.courseId), { interval: 1000, timeout: 200_000 })
      .toMatchObject({ quorum: 2, role: 'owner', sharedKey })
    // Its latest version (Marko's 0.3), as her own course; not the old drive's.
    const course = (await ana.evaluate(() => window.courses.list('en'))).find((entry) => entry.id === ids.courseId)
    expect(course).toMatchObject({ distribution: 'local' })
    expect(course.publishedVersion).toBe((await apps.coMaintainer.page.evaluate((id) => window.courses.list('en').then((list) => list.find((entry) => entry.id === id)?.publishedVersion), ids.courseId)))
  }, 260_000)

  it("Marko's new computer joins again with a fresh invite from Ana, and gets the course", async () => {
    await close('coMaintainer')
    const ana = apps.coOwnerNew.page
    const marko = await restoreOn('coMaintainerNew', 'co-maintainer.matko-identity')
    const { code } = await ana.evaluate((courseId) => window.maintainers.invite(courseId), ids.courseId)
    await marko.evaluate((code) => window.maintainers.accept(code), code)
    await expect
      .poll(() => marko.evaluate((id) => window.maintainers.get(id).then((info) => info?.sharedKey ?? null), ids.courseId), {
        interval: 1000,
        timeout: 120_000,
      })
      .toBe(sharedKey)
    expect(await marko.evaluate((id) => window.maintainers.get(id).then((info) => info.role), ids.courseId)).toBe('maintainer')
  }, 180_000)
})
