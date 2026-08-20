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
  sleep,
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
      'get',
      'getLessonTestDraft',
      'list',
      'remove',
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
    await sleep(1000)
    expect(harness.page.url()).toContain('#/onboarding/role')

    const teacherIdx = await findIndex(harness.page, (e) => e.text === 'Teacher')
    expect(teacherIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, teacherIdx)
    await sleep(1500)

    expect(harness.page.url()).not.toContain('#/onboarding')
    const text = await bodyText(harness.page)
    expect(text).toContain('Create new course')
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
    await harness.page.evaluate(() => location.reload())
    await sleep(4000)
    await clickText(harness.page, 'Drafts')
    await sleep(1500)
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

describe('i18n', () => {
  it('translates the app when the locale is switched and persists the choice', async () => {
    const pickerIdx = await findIndex(harness.page, (e) => e.text.includes('English'))
    expect(pickerIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, pickerIdx)
    await sleep(800)

    const serbianIdx = await findIndex(harness.page, (e) => e.text.includes('Srpski'))
    expect(serbianIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, serbianIdx)
    await sleep(1500)

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
