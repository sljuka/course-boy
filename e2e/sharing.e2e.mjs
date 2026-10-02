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
import { launchApp, waitFor, waitForText } from './launch.mjs'

const ROOT = '/tmp/matko-e2e-sharing'
const dirs = {
  student1: path.join(ROOT, 'student-1'),
  student2: path.join(ROOT, 'student-2'),
  student3: path.join(ROOT, 'student-3'),
  teacher: path.join(ROOT, 'teacher'),
}

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

async function cutAndPublish(page, courseId) {
  const { version } = await page.evaluate(
    (id) => window.courses.cutVersion({ courseId: id, releaseType: 'minor' }),
    courseId,
  )
  await page.evaluate(
    ({ courseId, version }) => window.courses.publishVersion({ courseId, version }),
    { courseId, version },
  )
  return version
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

  it('a student imports with the code, and the app records where the course came from', async () => {
    const page = await launch('student1')

    expect(await importCourse(page, code)).toEqual({ courseId })

    const courses = await page.evaluate(() => window.courses.list('en'))
    expect(courses.find((course) => course.id === courseId)?.version).toBe(publishedVersion)

    const source = JSON.parse(fs.readFileSync(path.join(dirs.student1, 'courses', courseId, 'source.json'), 'utf8'))
    expect(IdEncoding.normalize(source.driveKey)).toBe(IdEncoding.normalize(code))

    const sharingState = JSON.parse(fs.readFileSync(path.join(dirs.student1, 'course-sharing.json'), 'utf8'))
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
      .readdirSync(path.join(dirs.student2, 'courses', courseId), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.md'))
      .map((file) => fs.readFileSync(path.join(dirs.student2, 'courses', courseId, file), 'utf8'))
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
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    await waitFor(page, () => document.querySelector('[data-testid="course-code"]') !== null)
    expect(await page.inputValue('[data-testid="course-code"]')).toBe(code)
    await page.getByRole('button', { name: 'Done' }).click()

    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await expect.poll(rowText, { timeout: 10_000 }).toContain(version)
  })
})
