// SLJ-38 (SLJ-9 part 1): courses stay shared across restarts. A teacher and
// students as separate app instances (own userData each), all on a local DHT
// testnet (`hyperdht/testnet`, passed to each worker through MATKO_DHT_BOOTSTRAP)
// so nothing touches the public network.
//
//   teacher publishes → code; publishes again → same code
//   student 1 imports with the code → where it came from is recorded
//   teacher + student 1 restart, teacher stays offline → student 2 imports from student 1
//   teacher restarts → still shared → student 3 imports from the teacher alone

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import createTestnet from 'hyperdht/testnet.js'
import IdEncoding from 'hypercore-id-encoding'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { bodyText, launchApp, profileDataDir, waitFor, waitForText } from './launch.mjs'
import { openIdentityBackup } from '../workers/identity-backup.cjs'

const ROOT = '/tmp/matko-e2e-sharing'
const dirs = {
  student1: path.join(ROOT, 'student-1'),
  student2: path.join(ROOT, 'student-2'),
  student3: path.join(ROOT, 'student-3'),
  newTeacher: path.join(ROOT, 'new-teacher'),
  teacher: path.join(ROOT, 'teacher'),
}

// Where each instance keeps its data: its e2e profile's folder (SLJ-57).
const data = Object.fromEntries(Object.entries(dirs).map(([name, dir]) => [name, profileDataDir(dir)]))

let testnet
let env
const apps = {}

async function launch(name, { fresh = true } = {}) {
  apps[name] = await launchApp({ env, fresh, userData: dirs[name] })
  return apps[name].page
}

async function close(name) {
  await apps[name]?.close()
  delete apps[name]
}

// Sharing runs in the background after Publish/startup; poll its status.
async function waitForSharing(page, courseId, predicate, timeout = 30_000) {
  let info
  await expect
    .poll(
      async () => {
        info = await page.evaluate((id) => window.sharing.getCourseSharing(id), courseId)
        return predicate(info)
      },
      { interval: 250, timeout },
    )
    .toBe(true)
  return info
}

async function writeLesson(page, ids, text) {
  await page.evaluate(
    ({ courseId, lessonId, sectionId, text }) =>
      window.courses.updateLessonContent({
        courseId,
        lessonId,
        locales: { en: { body: `[matko-block]: <> (markdown)\n${text}` } },
        sectionId,
      }),
    { ...ids, text },
  )
}

async function cutAndPublish(page, courseId, { releaseType = 'minor', recommended = false } = {}) {
  const { version } = await page.evaluate(
    (input) => window.courses.cutVersion(input),
    { courseId, recommended, releaseType },
  )
  await page.evaluate(
    ({ courseId, version }) => window.courses.publishVersion({ courseId, version }),
    { courseId, version },
  )
  return version
}

// The pending update of an imported course, once the student's app has seen it.
function waitForUpdate(page, courseId, predicate, timeout = 30_000) {
  return waitForSharing(page, courseId, (info) => Boolean(info.update) && predicate(info.update), timeout)
}

async function finishOnboarding(page, role) {
  await page.evaluate(
    (role) => window.preferences.set({ category: 'other', nickname: 'E2E', persona: 'course-boy', role }),
    role,
  )
  await page.reload()
  await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
}

// An imported course is kept as versions/<v>/ + release.json (SLJ-40).
function currentVersionDir(userData, courseId) {
  const courseRoot = path.join(userData, 'courses', courseId)
  const { publishedVersion } = JSON.parse(fs.readFileSync(path.join(courseRoot, 'release.json'), 'utf8'))
  return path.join(courseRoot, 'versions', publishedVersion)
}

// The current version's files, relative to its folder.
function currentVersionFiles(userData, courseId) {
  const dir = currentVersionDir(userData, courseId)
  return fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.md') || file.endsWith('.json'))
    .map((file) => ({ dir, file, path: path.join(dir, file) }))
}

async function importCourse(page, code) {
  return page.evaluate((code) => window.sharing.importCourse({ code }), code)
}

beforeAll(async () => {
  fs.rmSync(ROOT, { force: true, recursive: true })
  testnet = await createTestnet(3)
  env = {
    MATKO_DHT_BOOTSTRAP: testnet.bootstrap.map(({ host, port }) => `${host}:${port}`).join(','),
  }
})

afterAll(async () => {
  for (const name of Object.keys(apps)) {
    await close(name)
  }
  await testnet?.destroy()
  fs.rmSync(ROOT, { force: true, recursive: true })
})

describe('sharing across restarts', () => {
  let ids
  let courseId
  let code
  let publishedVersion

  it('Publish puts the course online, and the code stays the same for a new version', async () => {
    const page = await launch('teacher')
    await page.evaluate(() => window.preferences.set({ hasAcknowledgedCreatorKey: true }))

    ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Shared Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    courseId = ids.courseId

    await writeLesson(page, ids, 'First version.')
    await cutAndPublish(page, courseId)
    const first = await waitForSharing(page, courseId, (info) => info.status === 'shared')
    code = first.code
    expect(code).toBeTruthy()

    await writeLesson(page, ids, 'Second version.')
    publishedVersion = await cutAndPublish(page, courseId)
    const second = await waitForSharing(page, courseId, (info) => info.status === 'shared')
    expect(second.code).toBe(code)
  })

  // SLJ-53: the teacher saves a password-protected backup of the publisher
  // identity from Settings. The file opens with the password (and only with
  // it) and holds the identity behind the code and the published course.
  it('a teacher saves a backup of the publisher identity that opens with the password', async () => {
    const page = apps.teacher.page
    const backupPath = path.join(ROOT, 'teacher-identity.matko-identity')
    await apps.teacher.app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backupPath)

    await finishOnboarding(page, 'teacher')
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await waitForText(page, 'Not backed up yet.')
    await page.getByRole('button', { name: 'Save backup…' }).click()
    await page.getByLabel('Password', { exact: true }).fill('correct horse battery')
    await page.getByLabel('Type the password again').fill('correct horse battery')
    await page.click('[data-testid="save-identity-backup"]')
    await waitForText(page, 'Backed up on')
    expect(await page.locator('[data-testid="backup-reminder-dot"]').count()).toBe(0)

    const text = fs.readFileSync(backupPath, 'utf8')
    expect(() => openIdentityBackup(text, 'wrong password')).toThrow(/Wrong password/)
    const opened = openIdentityBackup(text, 'correct horse battery')
    expect(opened.courses).toEqual([{ id: courseId, title: 'E2E Shared Course' }])
    expect(opened.publisherId).toBe(await page.evaluate(() => window.sharing.getCreatorKey()))
    // The identity behind the code: the course's drive key derives from it.
    const store = new Corestore(path.join(ROOT, 'restored-store'), { primaryKey: opened.primaryKey, unsafe: true })
    const drive = new Hyperdrive(store.namespace(`course-${courseId}`))
    await drive.ready()
    expect(IdEncoding.normalize(drive.key)).toBe(code)
    await drive.close()
    await store.close()
  })

  // SLJ-53: nothing goes online without a backup of the publisher identity.
  // The first Publish asks for one after the consent; cancelling it cancels
  // the Publish, saving it publishes, and the backup covers the course.
  it("a teacher's first Publish waits for a backup of the identity", async () => {
    const page = await launch('newTeacher')
    const backupPath = path.join(ROOT, 'new-teacher.matko-identity')
    await apps.newTeacher.app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backupPath)
    await finishOnboarding(page, 'teacher')
    const { courseId: newCourseId, version } = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E First Publish' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      await window.courses.updateLessonContent({
        courseId,
        lessonId,
        locales: { en: { body: '[matko-block]: <> (markdown)\nHello.' } },
        sectionId,
      })
      const { version } = await window.courses.cutVersion({ courseId, releaseType: 'minor' })
      return { courseId, version }
    })
    expect(await page.locator('[data-testid="backup-reminder-dot"]').count()).toBe(0)

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, newCourseId)
    await waitFor(page, (v) => [...document.querySelectorAll('span')].some((e) => e.textContent === v), { arg: version })
    const publishFromPanel = async () => {
      await page.locator('span', { hasText: new RegExp(`^${version.replace(/\./g, '\\.')}$`) }).first().click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Publish' }).click()
    }
    const publishedVersion = async () =>
      (await page.evaluate((id) => window.courses.getVersionHistory(id), newCourseId)).publishedVersion

    // Consent, then the backup, eased in: first what signing and the identity
    // are. Cancelling leaves the course offline.
    await publishFromPanel()
    await page.getByRole('button', { name: `Publish ${version}` }).click()
    await waitForText(page, 'Before your course goes online')
    expect(await bodyText(page)).toContain("Let's start with the password.")
    await page.getByRole('button', { name: 'Cancel' }).click()
    expect(await publishedVersion()).toBeNull()

    // Publish again: the consent is given, the backup is still required.
    await publishFromPanel()
    await waitForText(page, 'Before your course goes online')
    await page.getByRole('button', { name: 'Choose a password' }).click()
    await page.getByLabel('Password', { exact: true }).fill('correct horse battery')
    await page.getByLabel('Type the password again').fill('correct horse battery')
    await page.getByRole('button', { name: 'Save backup and publish' }).click()
    await waitForText(page, `Published ${version}`)
    expect(await publishedVersion()).toBe(version)
    expect(openIdentityBackup(fs.readFileSync(backupPath, 'utf8'), 'correct horse battery').courses).toEqual([
      { id: newCourseId, title: 'E2E First Publish' },
    ])
    await page.getByRole('button', { name: 'Done' }).click()

    // Online and covered by the backup: no reminder.
    await waitForSharing(page, newCourseId, (info) => info.status === 'shared')
    await page.waitForTimeout(500)
    expect(await page.locator('[data-testid="backup-reminder-dot"]').count()).toBe(0)
    await close('newTeacher')
  })

  it('a student imports with the code, and the app records where the course came from', async () => {
    const page = await launch('student1')

    expect(await importCourse(page, code)).toEqual({ courseId })

    const courses = await page.evaluate(() => window.courses.list('en'))
    expect(courses.find((course) => course.id === courseId)?.version).toBe(publishedVersion)

    const source = JSON.parse(fs.readFileSync(path.join(currentVersionDir(data.student1, courseId), 'source.json'), 'utf8'))
    expect(IdEncoding.normalize(source.driveKey)).toBe(IdEncoding.normalize(code))

    const sharingState = JSON.parse(fs.readFileSync(path.join(data.student1, 'course-sharing.json'), 'utf8'))
    expect(IdEncoding.normalize(sharingState.followed[courseId].driveKey)).toBe(IdEncoding.normalize(code))
  })

  it('after a restart, a student keeps sharing the course with classmates while the teacher is offline', async () => {
    await close('teacher')
    await close('student1')

    const student1 = await launch('student1', { fresh: false })
    await waitForSharing(student1, courseId, (info) => info.status === 'shared')

    const student2 = await launch('student2')
    expect(await importCourse(student2, code)).toEqual({ courseId })
    const lessonText = fs
      .readdirSync(path.join(data.student2, 'courses', courseId), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.md'))
      .map((file) => fs.readFileSync(path.join(data.student2, 'courses', courseId, file), 'utf8'))
      .join('\n')
    expect(lessonText).toContain('Second version.')
  })

  it("after a restart, the teacher's app shares the course again with the same code", async () => {
    await close('student1')
    await close('student2')

    const teacher = await launch('teacher', { fresh: false })
    const info = await waitForSharing(teacher, courseId, (info) => info.status === 'shared')
    expect(info.code).toBe(code)

    const student3 = await launch('student3')
    expect(await importCourse(student3, code)).toEqual({ courseId })
  })

  // My courses keeps its list cached; publishing from the editor must refresh it.
  it('publishing from the editor refreshes My courses, and the editor offers the code', async () => {
    const page = apps.teacher.page
    const rowText = () =>
      page.evaluate(
        (title) =>
          [...document.querySelectorAll('[data-slot="list-group-content"] *')]
            .find((element) => element.children.length === 0 && element.textContent === title)
            ?.closest('[data-slot="list-group-content"] > *')?.textContent ?? '',
        'E2E Shared Course',
      )

    await writeLesson(page, ids, 'Third version.')
    const { version } = await page.evaluate(
      (id) => window.courses.cutVersion({ courseId: id, releaseType: 'minor' }),
      courseId,
    )

    // Past onboarding, as a teacher, so the app shows My courses and the editor.
    await page.evaluate(() =>
      window.preferences.set({ category: 'other', nickname: 'Teacher', persona: 'course-boy', role: 'teacher' }),
    )
    await page.reload()
    await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)

    // Load My courses once, so its list is cached from before the publish.
    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await waitForText(page, 'E2E Shared Course')
    expect(await rowText()).toContain(publishedVersion)

    // Publish from the editor's Versions panel, the way a teacher does.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    await waitFor(page, (v) => [...document.querySelectorAll('span')].some((e) => e.textContent === v), { arg: version })
    await page.locator('span', { hasText: new RegExp(`^${version.replace(/\./g, '\\.')}$`) }).first().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Publish' }).click()
    await waitForText(page, `Published ${version}`)
    await page.getByRole('button', { name: 'Done' }).click()

    // The editor (where My courses opens a course) offers the code too.
    await page.click('[data-testid="share-course"]')
    await waitFor(page, () => document.querySelector('[data-testid="course-code"]') !== null)
    expect(await page.inputValue('[data-testid="course-code"]')).toBe(code)
    await page.getByRole('button', { name: 'Done' }).click()

    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await expect.poll(rowText, { timeout: 10_000 }).toContain(version)
  })

  // The action bar: Commit new version, then Publish (the newest committed
  // version), which is disabled once that version is published. Share says
  // which version the code gives.
  it('Commit then Publish, and Share shows the version', async () => {
    const page = apps.teacher.page
    await writeLesson(page, ids, 'Third version. Committed, then published.')
    await page.evaluate((id) => {
      location.hash = `#/my-courses`
      setTimeout(() => (location.hash = `#/drafts/${id}`), 100)
    }, courseId)
    const commitButton = page.locator('[data-testid="commit-new-version"]')
    await expect.poll(() => commitButton.getAttribute('aria-label'), { timeout: 15_000 }).toBe('Commit new version')
    await commitButton.click()
    const cut = page.getByRole('dialog').getByRole('button', { name: /^Cut new version / })
    const version = (await cut.innerText()).replace(/^Cut new version /, '')
    await cut.click()

    const publishButton = page.locator('[data-testid="publish-course"]')
    await expect.poll(() => publishButton.getAttribute('aria-label')).toBe(`Publish ${version}`)
    await publishButton.click()
    await waitForText(page, `Published ${version}`)
    await page.getByRole('button', { name: 'Done' }).click()
    await expect.poll(() => publishButton.getAttribute('aria-label')).toBe(`${version} is already published`)
    expect(await publishButton.isDisabled()).toBe(true)

    await page.click('[data-testid="share-course"]')
    await waitFor(page, () => document.querySelector('[data-testid="shared-version"]') !== null)
    expect(await page.locator('[data-testid="shared-version"]').innerText()).toBe(`Shared version: ${version}`)
    await page.getByRole('button', { name: 'Done' }).click()
  })

  // SLJ-39: student 3 (still running, online) gets the version the teacher just
  // published in the editor.
  it('a student is offered the newer version and applies it; unchanged files are not rewritten', async () => {
    const student = apps.student3.page
    const teacherPage = apps.teacher.page
    const { version: newest } = (await teacherPage.evaluate((id) => window.courses.getVersionHistory(id), courseId))
      .versions[0]

    await waitForUpdate(student, courseId, (update) => update.version === newest && update.visibility === 'prominent')

    const before = currentVersionFiles(data.student3, courseId)

    await finishOnboarding(student, 'student')
    await student.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, courseId)
    await waitFor(student, () => document.querySelector('[data-testid="course-update-notice"]') !== null)
    await student.click('[data-testid="apply-course-update"]')
    await waitFor(student, () => document.querySelector('[data-testid="course-update-notice"]') === null, {
      timeout: 30_000,
    })

    const courses = await student.evaluate(() => window.courses.list('en'))
    expect(courses.find((course) => course.id === courseId)?.version).toBe(newest)

    const after = currentVersionFiles(data.student3, courseId)
    const lessonText = after.filter(({ file }) => file.endsWith('.md')).map(({ path }) => fs.readFileSync(path, 'utf8')).join('\n')
    expect(lessonText).toContain('Third version.')

    // The update is a new versions/<v>/ folder; files it didn't change are the
    // previous version's files (hardlinked), not rewritten copies, and the
    // changed lesson is a new file.
    expect(after[0].dir).not.toBe(before[0].dir)
    const inodeBefore = new Map(before.map(({ file, path }) => [file, fs.statSync(path).ino]))
    const unchanged = after.filter(({ file }) => file.startsWith('section-') && file.endsWith('.json'))
    expect(unchanged.length).toBeGreaterThan(0)
    for (const { file, path } of unchanged) {
      expect(fs.statSync(path).ino).toBe(inodeBefore.get(file))
    }
    const changedLesson = after.find(({ path }) => path.endsWith('.md') && fs.readFileSync(path, 'utf8').includes('Third version.'))
    expect(fs.statSync(changedLesson.path).ino).not.toBe(inodeBefore.get(changedLesson.file))
  })

  it('a skipped "fixes mistakes" version keeps an update recommended, even after "Finish on this version"', async () => {
    const student = apps.student3.page
    const teacherPage = apps.teacher.page

    await writeLesson(teacherPage, ids, 'Fourth version, fixing a mistake.')
    const fix = await cutAndPublish(teacherPage, courseId, { recommended: true })
    await waitForUpdate(student, courseId, (update) => update.version === fix && update.kind === 'recommended')

    await student.evaluate((id) => window.sharing.finishOnVersion(id), courseId)
    await waitForUpdate(student, courseId, (update) => update.visibility === 'quiet')

    // A later regular version: the student would still skip the fix, so it's
    // recommended, and it's shown again although they finished on their version.
    await writeLesson(teacherPage, ids, 'Fifth version.')
    const next = await cutAndPublish(teacherPage, courseId)
    const update = (
      await waitForUpdate(student, courseId, (update) => update.version === next)
    ).update
    expect(update).toMatchObject({ kind: 'recommended', visibility: 'prominent' })
    expect(update.changelog.map((entry) => entry.version)).toEqual([next, fix])

    await expect(student.evaluate((id) => window.sharing.applyCourseUpdate(id), courseId)).resolves.toEqual({
      version: next,
    })
  })

  it('a version published while the student was offline is offered at their next start, a big one with its notes', async () => {
    await close('student3')

    const teacherPage = apps.teacher.page
    await writeLesson(teacherPage, ids, 'Version one point oh.')
    const major = await cutAndPublish(teacherPage, courseId, { releaseType: 'major' })
    await waitForSharing(teacherPage, courseId, (info) => info.status === 'shared')

    const student = await launch('student3', { fresh: false })
    await waitForUpdate(student, courseId, (update) => update.version === major && update.isMajor)

    await student.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, courseId)
    await waitFor(student, () => document.querySelector('[data-testid="course-update-notice"]') !== null)
    await student.click('[data-testid="apply-course-update"]')
    // A big update shows its release notes before applying.
    await waitForText(student, `Big update: ${major}`)
    await student.getByRole('button', { name: `Update to ${major}` }).click()
    await waitFor(student, () => document.querySelector('[data-testid="course-update-notice"]') === null, {
      timeout: 30_000,
    })

    const courses = await student.evaluate(() => window.courses.list('en'))
    expect(courses.find((course) => course.id === courseId)?.version).toBe(major)
  })

  // SLJ-40: the versions kept on the student's device; going back and forward
  // needs no download.
  it('a student goes back to a previous version from the version menu, and forward again', async () => {
    const student = apps.student3.page
    const { current, kept } = (await student.evaluate((id) => window.sharing.getCourseSharing(id), courseId)).versions
    expect(kept.length).toBe(3) // the current version + 2 previous (the default)
    expect(kept[0]).toBe(current)
    const previous = kept[1]

    await student.click('[data-testid="course-version-menu"]')
    await student.getByRole('menuitemradio', { name: previous, exact: true }).click()
    await expect
      .poll(() => student.evaluate((id) => window.courses.list('en'), courseId).then((courses) => courses.find((course) => course.id === courseId)?.version))
      .toBe(previous)

    // Going back counts as "Finish on this version": no banner for the version
    // just left, only the quiet line.
    await waitFor(student, () => document.querySelector('[data-testid="course-update-quiet"]') !== null)
    expect(await student.evaluate(() => document.querySelector('[data-testid="course-update-notice"]'))).toBeNull()

    await student.click('[data-testid="course-version-menu"]')
    await student.getByRole('menuitemradio', { name: `${current} (newest)` }).click()
    await expect
      .poll(() => student.evaluate((id) => window.courses.list('en'), courseId).then((courses) => courses.find((course) => course.id === courseId)?.version))
      .toBe(current)
  })

  it("an imported course's menu offers Open in file system", async () => {
    const student = apps.student3.page
    await student.getByRole('button', { name: 'Course actions for E2E Shared Course' }).click()
    // Not clicked: it would open the OS file manager.
    await student.getByRole('menuitem', { name: 'Open in file system' }).waitFor()
    await student.keyboard.press('Escape')
  })

  // SLJ-43: progress and Cancel for imports and updates.
  describe('transfer progress', () => {
    let bigIds
    let bigCode
    const assetBytes = 2_000_000

    it('reports an import\'s exact total and ends at the full size', async () => {
      const teacherPage = apps.teacher.page
      bigIds = await teacherPage.evaluate(async (size) => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: 'E2E Big Course' } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
        const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
        const data = new Uint8Array(size)
        for (let offset = 0; offset < size; offset += 65536) crypto.getRandomValues(data.subarray(offset, offset + 65536))
        const asset = await window.courses.uploadAssetBytes({ courseId, data: data.buffer, filename: 'big.png', kind: 'image' })
        await window.courses.updateLessonContent({
          courseId,
          lessonId,
          locales: { en: { body: `[matko-block]: <> (image)\n![Big](${asset.path})` } },
          sectionId,
        })
        return { courseId, lessonId, sectionId }
      }, assetBytes)
      await cutAndPublish(teacherPage, bigIds.courseId)
      bigCode = (await waitForSharing(teacherPage, bigIds.courseId, (info) => info.status === 'shared')).code

      const student = apps.student3.page
      const transferId = 'e2e-import-big'
      expect(await student.evaluate(({ code, transferId }) => window.sharing.importCourse({ code, transferId }), { code: bigCode, transferId })).toEqual({
        courseId: bigIds.courseId,
      })

      const transfer = await student.evaluate((id) => window.sharing.getTransfer(id), transferId)
      expect(transfer.phase).toBe('done')
      expect(transfer.bytesTotal).toBeGreaterThanOrEqual(assetBytes)
      expect(transfer.bytesDone).toBe(transfer.bytesTotal)
    })

    it('an update that changes one lesson downloads only that, not the whole course', async () => {
      const teacherPage = apps.teacher.page
      const student = apps.student3.page
      await writeLesson(teacherPage, bigIds, 'Only this lesson changed.')
      const version = await cutAndPublish(teacherPage, bigIds.courseId)
      await waitForUpdate(student, bigIds.courseId, (update) => update.version === version)

      const transferId = 'e2e-update-small'
      expect(
        await student.evaluate(({ courseId, transferId }) => window.sharing.applyCourseUpdate(courseId, transferId), {
          courseId: bigIds.courseId,
          transferId,
        }),
      ).toEqual({ version })

      const transfer = await student.evaluate((id) => window.sharing.getTransfer(id), transferId)
      expect(transfer.phase).toBe('done')
      expect(transfer.bytesTotal).toBeGreaterThan(0)
      expect(transfer.bytesTotal).toBeLessThan(assetBytes / 10)
    })

    // SLJ-49: the Import dialog hands off to Home, which lists the course
    // under Downloading while it runs and under Imported once it has landed.
    it('an import from Home lands in the Imported group', async () => {
      const teacherPage = apps.teacher.page
      const courseId = await teacherPage.evaluate(async () => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: 'E2E Home Import' } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
        await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
        return courseId
      })
      await cutAndPublish(teacherPage, courseId)
      const homeCode = (await waitForSharing(teacherPage, courseId, (info) => info.status === 'shared')).code

      const student = apps.student3.page
      await student.evaluate(() => {
        location.hash = '#/'
      })
      await student.getByRole('button', { name: 'Import course' }).first().click()
      await student.getByLabel('Course code').fill(homeCode)
      await student.getByRole('button', { name: 'Import', exact: true }).click()
      await student.getByRole('dialog').waitFor({ state: 'detached' })

      await waitFor(student, () =>
        document.querySelector('[data-testid="home-group-imported"]')?.textContent?.includes('E2E Home Import'),
        { timeout: 30_000 },
      )
      expect(await student.locator('[data-testid="pending-import"]').count()).toBe(0)

      // The course page's Details panel: where it came from, its version and
      // when it was made, cut and imported, and its id (no longer a badge).
      await student.getByRole('link', { name: 'E2E Home Import' }).first().click()
      await waitFor(student, () => document.querySelector('[data-testid="course-info"]') !== null)
      const info = await student.locator('[data-testid="course-info"]').innerText()
      for (const label of ['Source', 'Imported', 'Version', 'Version date', 'Created', 'Sections', 'Lessons', 'ID']) {
        expect(info).toContain(label)
      }
      expect(info).toContain(courseId)
      const installed = (await student.evaluate(() => window.courses.list('en'))).find((course) => course.id === courseId)
      expect(info).toContain(installed.version)
      // The teacher is online and connected: at least one peer.
      await waitFor(
        student,
        () => Number(document.querySelector('[data-testid="course-info-peers"]')?.textContent) >= 1,
        { timeout: 15_000 },
      )

      // Students can pass a publicly shared course on: the same code.
      await student.click('[data-testid="share-course"]')
      await waitFor(student, () => document.querySelector('[data-testid="course-code"]') !== null)
      expect(await student.inputValue('[data-testid="course-code"]')).toBe(homeCode)
      await student.getByRole('button', { name: 'Done' }).click()
    })

    it('with the teacher offline, the import keeps looking until the student cancels, and leaves nothing behind', async () => {
      const teacherPage = apps.teacher.page
      const offlineCode = await teacherPage.evaluate(async () => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: 'E2E Offline Course' } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
        await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
        return courseId
      }).then(async (courseId) => {
        await cutAndPublish(teacherPage, courseId)
        return (await waitForSharing(teacherPage, courseId, (info) => info.status === 'shared')).code
      })
      await close('teacher')

      const student = apps.student3.page
      const coursesBefore = (await student.evaluate(() => window.courses.list('en'))).length
      await student.evaluate(() => {
        location.hash = '#/'
      })
      await student.getByRole('button', { name: 'Import course' }).first().click()
      await student.getByLabel('Course code').fill(offlineCode)
      await student.getByRole('button', { name: 'Import', exact: true }).click()
      // The dialog hands off to Home (SLJ-49): the course waits under Downloading.
      await student.getByRole('dialog').waitFor({ state: 'detached' })
      await waitFor(student, () =>
        document.querySelector('[data-testid="home-group-downloading"]')?.textContent?.includes('Looking for the course…'),
      )

      await student.click('[data-testid="cancel-transfer"]')
      await student.locator('[data-testid="pending-import"]').waitFor({ state: 'detached' })
      expect(await bodyText(student)).not.toContain("Couldn't import this course")

      const coursesRoot = path.join(data.student3, 'courses')
      expect(fs.readdirSync(coursesRoot).filter((name) => name.startsWith('.import-staging'))).toEqual([])
      expect((await student.evaluate(() => window.courses.list('en'))).length).toBe(coursesBefore)
    })
  })
})

