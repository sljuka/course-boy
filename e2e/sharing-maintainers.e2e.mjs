// SLJ-11: a course maintained by two teachers (approval with multisig), its
// students following it to its shared code, restoring on new computers, and
// adding a third maintainer (SLJ-70).

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
  coThird: 'co-third',
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
    await ana.evaluate(() => window.preferences.set({ publisherName: 'Ana E2E' }))
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
    await marko.evaluate(() => window.preferences.set({ publisherName: 'Marko E2E' }))
    fs.copyFileSync(identityFilePath('coMaintainer'), path.join(ROOT, 'co-maintainer.matko-identity'))

    // Ana invites from the course editor's Maintainers panel.
    await ana.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    // The invite is for Marko alone: his publisher id first (SLJ-67).
    const markoPublisherId = await marko.evaluate(() => window.sharing.getCreatorKey())
    await ana.click('[data-testid="invite-maintainer"]')
    await ana.fill('[data-testid="maintainer-invitee"]', markoPublisherId)
    await ana.click('[data-testid="create-maintainer-invite"]')
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
    // Both maintainers listed; Ana starts, with "2 of 2" (the only rule for two).
    await waitFor(ana, () => document.querySelectorAll('[data-testid="maintainer"]').length === 2, { timeout: 30_000 })
    await ana.click('[data-testid="open-start-sharing"]')
    await waitForText(ana, '2 of 2 approvals required')
    await ana.click('[data-testid="start-sharing"]')
    await waitFor(ana, () => document.querySelector('[data-testid="maintainers-waiting"]') !== null, { timeout: 30_000 })

    // Marko: Approvals in the sidebar, the review, Approve.
    await marko.locator('[data-testid="sidebar-approvals"] a').waitFor({ timeout: 30_000 })
    // The badge counts what waits for him (SLJ-109).
    await waitFor(marko, () => document.querySelector('[data-testid="sidebar-approvals-count"]')?.textContent === '1', {
      timeout: 30_000,
    })
    await marko.locator('[data-testid="sidebar-approvals"] a').click()
    await marko.locator('[data-testid="approvals-group-waiting-for-you"]').waitFor({ timeout: 30_000 })
    // Named by the course's title, though the course isn't on Marko's computer yet.
    await waitForText(marko, 'E2E Co-maintained Course')
    await marko.locator('[data-testid="approval"] a').first().click()
    // Its release notes first; the files it changes folded below, opened to check.
    await marko.locator('[data-testid="approval-release-notes"]').waitFor({ timeout: 30_000 })
    await marko.click('[data-testid="approval-files"]')
    await waitFor(marko, () => document.querySelectorAll('[data-testid="approval-changes"] > *').length > 0, { timeout: 30_000 })
    expect(await marko.locator('[data-testid="approval-changes"]').innerText()).not.toContain('version-meta.json')

    // Preview as student (SLJ-67): the proposed version, read like a course,
    // without landing it; nothing recorded; back to the review.
    await marko.click('[data-testid="preview-version"]')
    await marko.locator('[data-testid="course-preview-banner"]').waitFor({ timeout: 30_000 })
    const previewId = await marko.evaluate(() => location.hash.match(/#\/courses\/([^/?]+)/)?.[1])
    expect(previewId).toBeTruthy()
    expect(previewId).not.toBe(ids.courseId)
    await marko.click('[data-testid="course-start"]')
    await waitForText(marko, 'First version.', { timeout: 30_000 })
    // Still the preview: the player stays under its id.
    expect(await marko.evaluate(() => location.hash)).toContain(previewId)
    const markoProgress = await marko.evaluate(() => window.progress.get())
    expect(markoProgress.courses[previewId]).toBeUndefined()
    expect((await marko.evaluate(() => window.courses.list('en'))).some((course) => course.id === ids.courseId)).toBe(false)
    await marko.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, previewId)
    await marko.click('[data-testid="preview-back"]')
    await marko.locator('[data-testid="approve-version"]').waitFor({ timeout: 30_000 })
    await marko.click('[data-testid="approve-version"]')
    // Back in Approvals, it stays listed (SLJ-109): nothing waits for him any
    // more, and the badge is gone. It's Approved once it's online.
    await waitFor(marko, () => document.querySelector('[data-testid="approvals-group-waiting-for-you"]') === null, {
      timeout: 30_000,
    })
    await waitFor(marko, () => document.querySelector('[data-testid="approval"]') !== null)
    expect(await marko.locator('[data-testid="sidebar-approvals-count"]').count()).toBe(0)

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
    // SLJ-108: each knows the other in Publishers, from the course they maintain together.
    const markoId = await marko.evaluate(() => window.sharing.getCreatorKey())
    const anaPublishers = await ana.evaluate(() => window.publishers.list('en'))
    expect(anaPublishers.find((entry) => entry.publisherId === markoId)?.sources).toContainEqual(
      expect.objectContaining({ kind: 'maintainer', title: 'E2E Co-maintained Course' }),
    )
    await marko.locator('[data-testid="approvals-group-approved"] [data-testid="approval"]').waitFor({ timeout: 30_000 })
    // Its page now says where it stands, with nothing left to answer.
    await marko.locator('[data-testid="approval"] a').first().click()
    await waitFor(marko, () => document.querySelector('[data-testid="approval-status-summary"]')?.getAttribute('data-group') === 'approved', {
      timeout: 30_000,
    })
    expect(await marko.locator('[data-testid="approve-version"]').count()).toBe(0)
  }, 180_000)

  it("Marko publishes a new version; it goes online only after Ana approves, and the student is offered it", async () => {
    const ana = apps.coOwner.page
    const marko = apps.coMaintainer.page
    const student = apps.coStudent.page
    await writeLesson(marko, ids, 'Second version, by Marko.')
    // Cut, then Publish from the editor: for a shared course it asks for approval.
    let { version } = await marko.evaluate(
      (courseId) => window.courses.cutVersion({ courseId, releaseType: 'minor' }),
      ids.courseId,
    )
    await marko.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await marko.click('[data-testid="publish-course"]')
    await waitForText(marko, `Version ${version} sent for approval`, { timeout: 30_000 })
    await marko.getByRole('button', { name: 'Done' }).click()

    // SLJ-110: nobody else has approved it, so Marko can withdraw it from its
    // page; Ana's app sees it withdrawn. Publishing again proposes it anew.
    const own = await marko.evaluate(() =>
      window.maintainers.listApprovals().then(({ items }) => items.find((entry) => entry.mine && entry.group === 'waiting-for-others')),
    )
    await marko.evaluate(({ hash, publicId }) => {
      location.hash = `#/approvals/${publicId}/${hash}`
    }, own)
    await marko.click('[data-testid="withdraw-version"]')
    await waitFor(marko, () => document.querySelector('[data-testid="approval-status-summary"]')?.getAttribute('data-group') === 'replaced', {
      timeout: 30_000,
    })
    await expect
      .poll(
        () => ana.evaluate((hash) => window.maintainers.listApprovals().then(({ items }) => items.find((entry) => entry.hash === hash)?.withdrawn ?? null), own.hash),
        { interval: 500, timeout: 60_000 },
      )
      .not.toBe(false)
    // A withdrawn version isn't proposed again (not even at the next start):
    // a new one is.
    await writeLesson(marko, ids, 'Second version, by Marko. Fixed.')
    version = await cutAndPublish(marko, ids.courseId)

    const waitingForAna = () =>
      ana.evaluate(
        (withdrawn) =>
          window.maintainers.listApprovals().then(({ items }) => items.filter((entry) => entry.group === 'waiting-for-you' && entry.hash !== withdrawn)),
        own.hash,
      )
    await expect.poll(waitingForAna, { interval: 500, timeout: 60_000 }).toHaveLength(1)
    const [item] = await waitingForAna()
    expect(item.hash).not.toBe(own.hash)
    expect(item.version).toBe(version)
    expect(item).toMatchObject({ approvedBy: [await marko.evaluate(() => window.sharing.getCreatorKey())], quorum: 2, version })
    // Marko's own, waiting for Ana.
    expect(
      (await marko.evaluate(() => window.maintainers.listApprovals())).items.find((entry) => entry.hash === item.hash),
    ).toMatchObject({ group: 'waiting-for-others', mine: true })
    // Not online before the approval.
    expect((await student.evaluate((id) => window.sharing.getCourseSharing(id), ids.courseId)).update).toBeNull()

    await ana.evaluate((input) => window.maintainers.approve(input), { hash: item.hash, publicId: item.publicId })
    await waitForUpdate(student, ids.courseId, (update) => update.version === version, 60_000)
    expect(await student.evaluate((id) => window.sharing.applyCourseUpdate(id), ids.courseId)).toMatchObject({ version })
    const lesson = currentVersionFiles(data.coStudent, ids.courseId).find(({ file }) => file.endsWith('.md'))
    expect(fs.readFileSync(lesson.path, 'utf8')).toContain('Second version, by Marko.')
    // Both maintainers, each by the name they gave, as the student sees them.
    const [anaId, markoId] = await Promise.all([ana, marko].map((page) => page.evaluate(() => window.sharing.getCreatorKey())))
    const studentCourse = (await student.evaluate(() => window.courses.list('en'))).find((course) => course.id === ids.courseId)
    expect(studentCourse.publishedBy).toEqual([
      { name: 'Ana E2E', publisherId: anaId },
      { name: 'Marko E2E', publisherId: markoId },
    ])
    // Approved, in both maintainers' history.
    for (const page of [ana, marko]) {
      await expect
        .poll(
          () => page.evaluate((hash) => window.maintainers.listApprovals().then(({ items }) => items.find((entry) => entry.hash === hash)?.group), item.hash),
          { interval: 500, timeout: 60_000 },
        )
        .toBe('approved')
    }
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
    const markoPublisherId = await marko.evaluate(() => window.sharing.getCreatorKey())
    const { code } = await ana.evaluate((input) => window.maintainers.invite(input), {
      courseId: ids.courseId,
      publisherId: markoPublisherId,
    })
    await marko.evaluate((code) => window.maintainers.accept(code), code)
    await expect
      .poll(() => marko.evaluate((id) => window.maintainers.get(id).then((info) => info?.sharedKey ?? null), ids.courseId), {
        interval: 1000,
        timeout: 120_000,
      })
      .toBe(sharedKey)
    expect(await marko.evaluate((id) => window.maintainers.get(id).then((info) => info.role), ids.courseId)).toBe('maintainer')
  }, 180_000)

  // SLJ-70: Mila joins with an invite, Ana changes the maintainers to add
  // her (2 of 3 from now on); once Marko approves, the course moves to its
  // next shared code, the student follows, and Mila's app lands it.
  it('Ana adds a third maintainer; once approved the course moves and everyone follows', async () => {
    const ana = apps.coOwnerNew.page
    const marko = apps.coMaintainerNew.page
    const student = apps.coStudent.page
    const mila = await launch('coThird')
    await finishOnboarding(mila, 'teacher')
    await setUpIdentity(mila)
    const milaId = await mila.evaluate(() => window.sharing.getCreatorKey())
    const { code } = await ana.evaluate((input) => window.maintainers.invite(input), { courseId: ids.courseId, publisherId: milaId })
    await mila.evaluate((code) => window.maintainers.accept(code), code)

    // Ana's panel shows her as joined; Ana changes the maintainers.
    await ana.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await ana.locator('[data-testid="maintainer-pending"]').waitFor({ timeout: 60_000 })
    await ana.click('[data-testid="open-change-maintainers"]')
    await waitForText(ana, '2 of 3 approvals required')
    await ana.click('[data-testid="propose-change"]')
    await waitForText(ana, 'A change of maintainers is waiting for approval', { timeout: 60_000 })

    // Marko approves it (both parts: as a current maintainer and a new one).
    const waitingForMarko = () =>
      marko.evaluate(() =>
        window.maintainers.listApprovals().then(({ items }) => items.find((item) => item.change && item.group === 'waiting-for-you') ?? null),
      )
    await expect.poll(waitingForMarko, { interval: 1000, timeout: 60_000 }).not.toBeNull()
    const change = await waitingForMarko()
    expect(change.change).toMatchObject({ added: [milaId], quorum: 2, removed: [] })
    await marko.evaluate((input) => window.maintainers.approve(input), { hash: change.hash, publicId: change.publicId })

    // Ana's app puts it online: a new code, three maintainers.
    await expect
      .poll(() => ana.evaluate((id) => window.maintainers.get(id).then((info) => info?.members.length), ids.courseId), {
        interval: 1000,
        timeout: 90_000,
      })
      .toBe(3)
    const nextKey = await ana.evaluate((id) => window.maintainers.get(id).then((info) => info.sharedKey), ids.courseId)
    expect(nextKey).not.toBe(sharedKey)

    // The student's app follows it to the new code; Mila's lands the course.
    await expect
      .poll(() => student.evaluate((id) => window.sharing.getCourseSharing(id).then((info) => info.code), ids.courseId), {
        interval: 1000,
        timeout: 90_000,
      })
      .toBe(nextKey)
    await expect
      .poll(() => mila.evaluate((id) => window.maintainers.get(id).then((info) => info?.sharedKey ?? null), ids.courseId), {
        interval: 1000,
        timeout: 90_000,
      })
      .toBe(nextKey)
    expect((await mila.evaluate(() => window.courses.list('en'))).find((course) => course.id === ids.courseId)).toMatchObject({
      distribution: 'local',
    })
  }, 300_000)
})
