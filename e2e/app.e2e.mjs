// End-to-end coverage of the paths `npm run typecheck` cannot verify: the IPC
// contract between main, preload and the renderer (see docs/contracts.md), and the
// filesystem writes behind course drafts.
//
// Tests in this file share one app instance and run in order — later tests depend on
// state established by earlier ones (onboarding completed, draft created). Vitest runs
// tests within a file sequentially, which is what makes that safe.

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  launchApp,
  listInteractive,
  clickIndex,
  fillIndex,
  clickText,
  bodyText,
  findIndex,
  waitForText,
  waitForUrl,
} from './launch.mjs'

const USER_DATA = '/tmp/matko-e2e-vitest'
const NICKNAME = 'Quacky McDuck'

let harness

beforeAll(async () => {
  harness = await launchApp({ userData: USER_DATA, fresh: true })
}, 120_000)

afterAll(async () => {
  await harness?.close()
})

describe('launch', () => {
  it('starts at onboarding with the UI mounted', async () => {
    expect(harness.page.url()).toContain('#/onboarding')
    const childCount = await harness.page.evaluate(
      () => document.getElementById('root').childElementCount,
    )
    expect(childCount).toBeGreaterThan(0)
  })

  // Contract 1 in docs/contracts.md: preload.ts and electron-env.d.ts are
  // hand-maintained mirrors of each other with nothing verifying they agree.
  // This is the only automated check that they do.
  it('exposes the full preload bridge surface', async () => {
    const surface = await harness.page.evaluate(() => ({
      courses: Object.keys(window.courses ?? {}).sort(),
      preferences: Object.keys(window.preferences ?? {}).sort(),
    }))

    expect(surface.courses).toEqual([
      'createDraft',
      'createLesson',
      'createSection',
      'cutVersion',
      'get',
      'getLessonTestDraft',
      'getVersionHistory',
      'list',
      'publishVersion',
      'remove',
      'revertToVersion',
      'saveLessonTest',
      'updateDraftMetadata',
      'updateLessonContent',
      'uploadAsset',
    ])
    expect(surface.preferences).toEqual(['get', 'resetOnboarding', 'set'])
  })
})

describe('onboarding', () => {
  it('enables Continue only once a nickname is entered', async () => {
    const nickIdx = await findIndex(
      harness.page,
      (e) => e.tag === 'input' && e.placeholder,
    )
    expect(nickIdx).toBeGreaterThanOrEqual(0)

    const before = await listInteractive(harness.page)
    const continueBefore = before.find((e) => e.text === 'Continue')
    expect(continueBefore?.disabled).toBe(true)

    expect(await fillIndex(harness.page, nickIdx, NICKNAME)).toBe('OK')

    const after = await listInteractive(harness.page)
    const continueAfter = after.find((e) => e.text === 'Continue')
    expect(continueAfter?.disabled).toBe(false)
  })

  it('advances through the role step into the app', async () => {
    const continueIdx = await findIndex(harness.page, (e) => e.text === 'Continue')
    await clickIndex(harness.page, continueIdx)
    await waitForUrl(harness.page, '#/onboarding/role')
    expect(harness.page.url()).toContain('#/onboarding/role')

    const teacherIdx = await findIndex(harness.page, (e) => e.text === 'Teacher')
    expect(teacherIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, teacherIdx)
    await waitForUrl(harness.page, '#/onboarding', { shouldContain: false })

    expect(harness.page.url()).not.toContain('#/onboarding')

    // "Create new course" is a Teaching (My courses) action, not a Learning
    // (Home) one — it must not appear on the Home landing page.
    const homeText = await bodyText(harness.page)
    expect(homeText).not.toContain('Create new course')

    await clickText(harness.page, 'My courses')
    await waitForText(harness.page, 'Create new course')
    expect(await bodyText(harness.page)).toContain('Create new course')

    // Later tests in this file expect to land on Home.
    await clickText(harness.page, 'Home')
    await waitForText(harness.page, 'Getting Started with Matko')
  })

  it('persists the answers through electron-store', async () => {
    const prefs = await harness.page.evaluate(() => window.preferences.get())
    expect(prefs).toMatchObject({
      locale: 'en',
      nickname: NICKNAME,
      role: 'teacher',
    })
  })
})

describe('courses over IPC', () => {
  it('lists the bundled course seeded into userData on first run', async () => {
    const list = await harness.page.evaluate(() => window.courses.list('en'))
    const ids = list.map((c) => c.id)
    expect(ids).toContain('matko-getting-started')
  })

  it('renders that course in the UI, not just over IPC', async () => {
    await waitForText(harness.page, 'Getting Started with Matko')
    const text = await bodyText(harness.page)
    expect(text).toContain('Getting Started with Matko')
  })

  it('creates a draft and writes the package to disk', async () => {
    const result = await harness.page.evaluate(() =>
      window.courses.createDraft({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        locales: {
          en: { title: 'E2E Probe Course', description: 'Created by the e2e suite' },
        },
      }),
    )
    expect(result.courseId).toBe('e2e-probe-course')

    // Contract 4: drafts live under a `draft/` subdirectory of the course root.
    const manifestPath = path.join(
      USER_DATA,
      'courses',
      'e2e-probe-course',
      'draft',
      'course.json',
    )
    expect(fs.existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest).toMatchObject({
      id: 'e2e-probe-course',
      status: 'draft',
      defaultLocale: 'en',
      supportedLocales: ['en'],
      slug: 'e2e-probe-course',
    })
    expect(manifest.locales.en.title).toBe('E2E Probe Course')
  })

  it('shows the new draft in the UI after a refetch', async () => {
    await harness.page.reload()
    await waitForText(harness.page, 'My courses')
    await clickText(harness.page, 'My courses')
    await waitForText(harness.page, 'E2E Probe Course')
    expect(await bodyText(harness.page)).toContain('E2E Probe Course')
  })
})

describe('course assets', () => {
  const courseId = 'e2e-probe-course'
  const assetFilename = 'e2e-test-image.png'
  // 1x1 transparent PNG, base64-encoded.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  it('serves an uploaded image through the matko-asset:// protocol', async () => {
    const section = await harness.page.evaluate(
      (id) => window.courses.createSection({ courseId: id, title: 'E2E Section' }),
      courseId,
    )
    const lesson = await harness.page.evaluate(
      ({ id, sectionId }) =>
        window.courses.createLesson({ courseId: id, sectionId, title: 'E2E Lesson' }),
      { id: courseId, sectionId: section.sectionId },
    )

    // Write the asset directly rather than driving the OS file picker behind
    // window.courses.uploadAsset — Playwright cannot automate native dialogs.
    const assetsDir = path.join(USER_DATA, 'courses', courseId, 'draft', 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    fs.writeFileSync(path.join(assetsDir, assetFilename), Buffer.from(pngBase64, 'base64'))

    const body = `[matko-block]: <> (image)\n![Alt text](${assetFilename} "Caption")`

    await harness.page.evaluate(
      ({ id, sectionId, lessonId, body }) =>
        window.courses.updateLessonContent({
          courseId: id,
          lessonId,
          locales: { en: { body } },
          sectionId,
        }),
      { id: courseId, sectionId: section.sectionId, lessonId: lesson.lessonId, body },
    )

    // Assert the image actually loaded over the protocol, not just that an
    // <img> tag exists — a broken src would satisfy a DOM-presence check too.
    const result = await harness.page.evaluate(
      ({ id, filename }) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ ok: true, width: img.naturalWidth })
          img.onerror = () => resolve({ ok: false, width: 0 })
          img.src = `matko-asset://${id}/${encodeURIComponent(filename)}`
        }),
      { id: courseId, filename: assetFilename },
    )

    expect(result).toEqual({ ok: true, width: 1 })
  })

  it('returns a 404 response for a missing asset', async () => {
    const status = await harness.page.evaluate(
      (id) =>
        fetch(`matko-asset://${id}/does-not-exist.png`).then((response) => response.status),
      courseId,
    )
    expect(status).toBe(404)

    // Chromium logs the failed fetch as a console error; it's the behavior under
    // test, not a bug, so it shouldn't trip the "no uncaught errors" check below.
    harness.errors = harness.errors.filter(
      (message) => !message.includes('404 (Not Found)'),
    )
  })
})

describe('course version badge', () => {
  const courseId = 'e2e-probe-course'

  it('shows "draft" for a course that has never been cut', async () => {
    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === courseId)

    expect(course.versionBadge).toEqual({ kind: 'draft' })
  })

  it('shows the version once cut with no further changes', async () => {
    const result = await harness.page.evaluate(
      (id) => window.courses.cutVersion({ courseId: id, releaseType: 'minor' }),
      courseId,
    )
    expect(result.version).toBe('0.2.0')

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === courseId)

    expect(course.versionBadge).toEqual({ kind: 'version', version: '0.2.0' })
  })

  it('shows "draft" again once real content changes past the last cut', async () => {
    // An edit to `course.json` itself (version/updatedAt bookkeeping) does NOT
    // count — that file is deliberately excluded from the comparison (see
    // computeCourseVersionBadge in electron/course-registry.ts) since a cut
    // always rewrites it. Edit the lesson file created in "course assets"
    // instead, a real content file.
    const sectionDir = fs
      .readdirSync(path.join(USER_DATA, 'courses', courseId, 'draft'))
      .find((name) => name.startsWith('section-'))
    const lessonPath = fs
      .readdirSync(path.join(USER_DATA, 'courses', courseId, 'draft', sectionDir))
      .filter((name) => name.startsWith('lesson-'))
      .map((name) => path.join(USER_DATA, 'courses', courseId, 'draft', sectionDir, name))[0]
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'))
    lesson.locales.en.description = 'Edited after cutting a version'
    fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2))

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === courseId)

    expect(course.versionBadge).toEqual({ kind: 'draft' })
  })
})

describe('learner flow: attend a course and complete its test', () => {
  const courseId = 'e2e-attend-probe-course'
  let sectionId
  let lessonId

  it('authors a course with a section, a lesson, and a test', async () => {
    const draft = await harness.page.evaluate(() =>
      window.courses.createDraft({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        locales: {
          en: { title: 'E2E Attend Probe Course', description: '' },
        },
      }),
    )
    expect(draft.courseId).toBe(courseId)

    const section = await harness.page.evaluate(
      (id) => window.courses.createSection({ courseId: id, title: 'E2E Attend Section' }),
      courseId,
    )
    sectionId = section.sectionId

    const lesson = await harness.page.evaluate(
      ({ id, sectionId }) =>
        window.courses.createLesson({ courseId: id, sectionId, title: 'E2E Attend Lesson' }),
      { id: courseId, sectionId },
    )
    lessonId = lesson.lessonId

    // A single exercise with min === max variables: the "random" roll is
    // deterministic, so the expected answer (7) can be hardcoded below rather
    // than parsed back out of the rendered prompt.
    await harness.page.evaluate(
      ({ id, sectionId, lessonId }) =>
        window.courses.saveLessonTest({
          courseId: id,
          lessonId,
          sectionId,
          test: {
            exercises: [
              {
                locales: { en: { prompt: 'What is {{a}} plus {{b}}?' } },
                solution: { formula: 'a + b', precision: 0 },
                tags: ['practice'],
                variables: {
                  a: { max: 4, min: 4, type: 'integer' },
                  b: { max: 3, min: 3, type: 'integer' },
                },
              },
            ],
            template: '',
          },
        }),
      { id: courseId, sectionId, lessonId },
    )

    const testPath = path.join(
      USER_DATA,
      'courses',
      courseId,
      'draft',
      sectionId,
      `${lessonId.replace(/^lesson-/, 'test-')}.json`,
    )
    expect(fs.existsSync(testPath)).toBe(true)
  })

  it('lets a learner open the lesson, pass its test, and complete the course', async () => {
    await harness.page.evaluate(
      ({ id, lessonId }) => {
        location.hash = `#/courses/${id}/lessons/${lessonId}`
      },
      { id: courseId, lessonId },
    )
    await waitForText(harness.page, 'Continue')

    expect(await clickText(harness.page, 'Continue')).toContain('OK')
    await waitForText(harness.page, 'Check answer')

    const answerIdx = await findIndex(
      harness.page,
      (e) => e.tag === 'input' && e.placeholder === 'Type the result',
    )
    expect(answerIdx).toBeGreaterThanOrEqual(0)
    expect(await fillIndex(harness.page, answerIdx, '7')).toBe('OK')

    expect(await clickText(harness.page, 'Check answer')).toContain('OK')
    await waitForText(harness.page, 'Correct. You can continue to the next lesson.')

    expect(await clickText(harness.page, 'Continue')).toContain('OK')
    await waitForText(harness.page, 'Course complete')

    // Leave the player's BlankLayout (no locale picker/sidebar chrome) so
    // later describe blocks land back on normal app chrome.
    expect(await clickText(harness.page, 'Close course')).toContain('OK')
    await waitForText(harness.page, 'English')
  })
})

describe('i18n', () => {
  it('translates the app when the locale is switched and persists the choice', async () => {
    const pickerIdx = await findIndex(harness.page, (e) => e.text.includes('English'))
    expect(pickerIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, pickerIdx)
    await waitForText(harness.page, 'Srpski')

    const serbianIdx = await findIndex(harness.page, (e) => e.text.includes('Srpski'))
    expect(serbianIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, serbianIdx)
    await waitForText(harness.page, 'Početna')

    const text = await bodyText(harness.page)
    expect(text).toContain('Početna')
    expect(text).toContain('Moji kursevi')

    const prefs = await harness.page.evaluate(() => window.preferences.get())
    expect(prefs.locale).toBe('sr')
  })

  // Known bug, documented in CLAUDE.md: this string is a hardcoded literal in the
  // sidebar rather than an i18next key, so it stays English in every locale.
  // check:i18n cannot catch it — it only compares key parity between locale files.
  // Flip this to a real assertion once the literal is replaced with a key.
  it.fails('translates every visible string (Toggle Sidebar is hardcoded)', async () => {
    expect(await bodyText(harness.page)).not.toContain('Toggle Sidebar')
  })
})

describe('runtime health', () => {
  it('logged no uncaught renderer errors', () => {
    expect(harness.errors).toEqual([])
  })
})
