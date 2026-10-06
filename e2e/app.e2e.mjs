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
  waitFor,
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
      sharing: Object.keys(window.sharing ?? {}).sort(),
    }))

    expect(surface.courses).toEqual([
      // `applySvgPreset` was already missing from this list before this
      // change — a genuine, working method that this contract-1 check just
      // never caught (its own drift, not new).
      'applySvgPreset',
      'createDraft',
      'createLesson',
      'createSection',
      'createSectionTest',
      'cutVersion',
      'deleteLesson',
      'deleteSection',
      'deleteSectionTest',
      'get',
      'getLessonTestDraft',
      'getSectionTestDraft',
      'getUnusedDraftAssets',
      'getVersionHistory',
      'list',
      'openInFileSystem',
      'previewDraftChanges',
      'publishVersion',
      'remove',
      'removeSectionIntro',
      'revertToVersion',
      'saveLessonTest',
      'saveSectionTest',
      'updateDraftMetadata',
      'updateLessonContent',
      'updateSection',
      'updateSectionIntro',
      'updateSectionTestMetadata',
      'uploadAsset',
      'uploadAssetBytes',
    ])
    expect(surface.preferences).toEqual(['get', 'resetOnboarding', 'set'])
    expect(surface.sharing).toEqual([
      'applyCourseUpdate',
      'cancelTransfer',
      'finishOnVersion',
      'getCourseSharing',
      'getCreatorKey',
      'getIdentityBackupStatus',
      'getTransfer',
      'importCourse',
      'listCourseUpdates',
      'saveIdentityBackup',
      'switchCourseVersion',
    ])
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

  it('advances through the persona and role steps into the app', async () => {
    const continueIdx = await findIndex(harness.page, (e) => e.text === 'Continue')
    await clickIndex(harness.page, continueIdx)
    await waitForUrl(harness.page, '#/onboarding/persona')
    expect(harness.page.url()).toContain('#/onboarding/persona')

    // Selecting a persona's radio reveals its avatar image before the user
    // continues — each `RadioGroupItem` carries an `aria-label` since the
    // radio itself has no text content.
    const courseBotRadioIdx = await findIndex(
      harness.page,
      (e) => e.role === 'radio' && e.ariaLabel === 'Course bot',
    )
    expect(courseBotRadioIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, courseBotRadioIdx)

    const personaContinueIdx = await findIndex(harness.page, (e) => e.text === 'Continue')
    expect(personaContinueIdx).toBeGreaterThanOrEqual(0)
    await clickIndex(harness.page, personaContinueIdx)
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

describe('sidebar by role', () => {
  const sidebarLinkTexts = () =>
    harness.page.evaluate(() =>
      [...document.querySelectorAll('[data-sidebar=menu-button]')].map((item) => item.textContent),
    )

  it('hides teacher pages from students; Settings switches the role', async () => {
    await harness.page.evaluate(() => window.preferences.set({ role: 'student' }))
    await harness.page.reload()
    await waitFor(harness.page, () => document.querySelectorAll('[data-sidebar=menu-button]').length > 0)
    expect(await sidebarLinkTexts()).toEqual(['Home'])

    // Teacher pages stay reachable by URL (history, recently viewed), so the
    // route itself sends students Home.
    await harness.page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await waitFor(harness.page, () => location.hash === '#/')
    expect(new URL(harness.page.url()).hash).toBe('#/')

    // Switching back in Settings shows the teacher section again, no reload.
    await harness.page.evaluate(() => {
      location.hash = '#/settings'
    })
    await waitFor(harness.page, () => Boolean(document.querySelector('#settings-role-teacher')))
    await harness.page.click('label[for="settings-role-teacher"]')
    await waitFor(harness.page, () => document.querySelectorAll('[data-sidebar=menu-button]').length > 1)
    expect(await sidebarLinkTexts()).toEqual(['Home', 'My courses'])
    const prefs = await harness.page.evaluate(() => window.preferences.get())
    expect(prefs.role).toBe('teacher')

    // Leave the app on Home, where the next suite starts.
    await harness.page.evaluate(() => {
      location.hash = '#/'
    })
  })
})

// Course ids are opaque and random (src/lib/course-id.ts), so the suite
// captures the ids `createDraft` returns instead of predicting them.
const BUNDLED_COURSE_ID = 'thys2vej6my5mpxt'
const COURSE_ID_PATTERN = /^[a-z2-7]{16}$/
let probeCourseId

describe('courses over IPC', () => {
  // SLJ-16: overlapping list calls used to race while copying the bundled
  // course (EEXIST). The root setup now runs once per launch and is shared.
  it('answers overlapping list calls', async () => {
    const lists = await harness.page.evaluate(() =>
      Promise.all(Array.from({ length: 6 }, () => window.courses.list('en'))),
    )
    for (const list of lists) {
      expect(list.map((c) => c.id)).toContain(BUNDLED_COURSE_ID)
    }
  })

  it('lists the bundled course seeded into userData on first run', async () => {
    const list = await harness.page.evaluate(() => window.courses.list('en'))
    const ids = list.map((c) => c.id)
    expect(ids).toContain(BUNDLED_COURSE_ID)
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
    expect(result.courseId).toMatch(COURSE_ID_PATTERN)
    probeCourseId = result.courseId

    // Contract 4: drafts live under a `draft/` subdirectory of the course root.
    const manifestPath = path.join(
      USER_DATA,
      'courses',
      probeCourseId,
      'draft',
      'course.json',
    )
    expect(fs.existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest).toMatchObject({
      id: probeCourseId,
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

    // Never published, so it's listed under the Local group (SLJ-15).
    const localGroupTitles = await harness.page.evaluate(() => {
      const localGroup = [...document.querySelectorAll('[data-slot=list-group]')].find((group) =>
        group.querySelector('[data-slot=list-group-header]').textContent.startsWith('Local'),
      )
      return [...localGroup.querySelectorAll('[data-slot=list-row-link]')].map((link) => link.textContent)
    })
    expect(localGroupTitles).toContain('E2E Probe Course')
  })
})

describe('course assets', () => {
  const assetFilename = 'e2e-test-image.png'
  // 1x1 transparent PNG, base64-encoded.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  it('serves an uploaded image through the matko-asset:// protocol', async () => {
    const section = await harness.page.evaluate(
      (id) => window.courses.createSection({ courseId: id, title: 'E2E Section' }),
      probeCourseId,
    )
    const lesson = await harness.page.evaluate(
      ({ id, sectionId }) =>
        window.courses.createLesson({ courseId: id, sectionId, title: 'E2E Lesson' }),
      { id: probeCourseId, sectionId: section.sectionId },
    )

    // Write the asset directly rather than driving the OS file picker behind
    // window.courses.uploadAsset — Playwright cannot automate native dialogs.
    const assetsDir = path.join(USER_DATA, 'courses', probeCourseId, 'draft', 'assets')
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
      { id: probeCourseId, sectionId: section.sectionId, lessonId: lesson.lessonId, body },
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
      { id: probeCourseId, filename: assetFilename },
    )

    expect(result).toEqual({ ok: true, width: 1 })
  })

  // A video player always asks for byte ranges. An imported course has no
  // draft/, and its files are in versions/<v>/: the range request must find
  // them there, not 404 on the missing draft/ (it did until 2026-10-03).
  it("serves a byte range of an imported course's video from its current version", async () => {
    const importedId = 'e2erangetestaaaa'
    const courseRoot = path.join(USER_DATA, 'courses', importedId)
    const assetsDir = path.join(courseRoot, 'versions', '1.0.0', 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    fs.writeFileSync(path.join(courseRoot, 'release.json'), JSON.stringify({ publishedVersion: '1.0.0' }))
    fs.writeFileSync(path.join(assetsDir, 'clip.mov'), Buffer.from('0123456789'))

    const result = await harness.page.evaluate(
      (id) =>
        fetch(`matko-asset://${id}/clip.mov`, { headers: { Range: 'bytes=2-5' } }).then(async (response) => ({
          body: await response.text(),
          contentRange: response.headers.get('Content-Range'),
          status: response.status,
        })),
      importedId,
    )

    fs.rmSync(courseRoot, { force: true, recursive: true })
    expect(result).toEqual({ body: '2345', contentRange: 'bytes 2-5/10', status: 206 })
  })

  it('returns a 404 response for a missing asset', async () => {
    const status = await harness.page.evaluate(
      (id) =>
        fetch(`matko-asset://${id}/does-not-exist.png`).then((response) => response.status),
      probeCourseId,
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

  it('shows "draft" for a course that has never been cut', async () => {
    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === probeCourseId)

    expect(course.versionBadge).toEqual({ kind: 'draft' })
  })

  it('shows the version once cut with no further changes', async () => {
    const result = await harness.page.evaluate(
      (id) => window.courses.cutVersion({ courseId: id, releaseType: 'minor' }),
      probeCourseId,
    )
    expect(result.version).toBe('0.2.0')

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === probeCourseId)

    expect(course.versionBadge).toEqual({ kind: 'version', version: '0.2.0' })
  })

  it('shows "draft" again once real content changes past the last cut', async () => {
    // An edit to `course.json` itself (version/updatedAt bookkeeping) does NOT
    // count — that file is deliberately excluded from the comparison (see
    // computeCourseVersionBadge in electron/course-registry.ts) since a cut
    // always rewrites it. Edit the lesson file created in "course assets"
    // instead, a real content file.
    const sectionDir = fs
      .readdirSync(path.join(USER_DATA, 'courses', probeCourseId, 'draft'))
      .find((name) => name.startsWith('section-'))
    const lessonPath = fs
      .readdirSync(path.join(USER_DATA, 'courses', probeCourseId, 'draft', sectionDir))
      .filter((name) => name.startsWith('lesson-'))
      .map((name) => path.join(USER_DATA, 'courses', probeCourseId, 'draft', sectionDir, name))[0]
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'))
    lesson.locales.en.description = 'Edited after cutting a version'
    // Replace (write temp, then rename) the way the app's own writers do: the
    // draft file is hardlinked into the cut version, so an in-place write would
    // silently edit the version too (docs/contracts.md §5).
    fs.writeFileSync(`${lessonPath}.tmp-e2e`, JSON.stringify(lesson, null, 2))
    fs.renameSync(`${lessonPath}.tmp-e2e`, lessonPath)

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === probeCourseId)

    expect(course.versionBadge).toEqual({ kind: 'draft' })
  })
})

describe('page breadcrumbs', () => {
  it('shows the editor trail in the page toolbar and navigates from it', async () => {
    await harness.page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, probeCourseId)
    // The course title arrives with the course details query; until then the
    // trail shows a placeholder, so wait for the real one.
    await waitFor(harness.page, () =>
      [...document.querySelectorAll('[data-slot=breadcrumb-item]')]
        .map((item) => item.textContent)
        .join(' › ') === 'My courses › E2E Probe Course',
    )

    const trail = await harness.page.evaluate(() =>
      [...document.querySelectorAll('[data-slot=breadcrumb-item]')].map((item) => item.textContent),
    )
    expect(trail).toEqual(['My courses', 'E2E Probe Course'])

    await harness.page.evaluate(() =>
      [...document.querySelectorAll('[data-slot=breadcrumb-link]')]
        .find((link) => link.textContent === 'My courses')
        .click(),
    )
    await waitForUrl(harness.page, '#/my-courses')
    expect(harness.page.url()).toContain('#/my-courses')
  })

  it('keeps page actions and the explorer toggle in the action bar, not the breadcrumb row', async () => {
    await harness.page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, probeCourseId)
    await waitFor(harness.page, () =>
      Boolean(document.querySelector('[data-slot=page-action-bar] [aria-label="Show or hide explorer"]')),
    )

    const rows = await harness.page.evaluate(() => ({
      actionBar: document.querySelector('[data-slot=page-action-bar]').textContent,
      toolbar: document.querySelector('[data-slot=page-toolbar]').textContent,
      sidePanels: [...document.querySelectorAll('[data-slot=page-side-panel]')].map((panel) => ({
        side: panel.dataset.side,
        title: panel.querySelector('[data-slot=panel-card-header]')?.textContent,
      })),
    }))
    // Preview course and Publish are round icon buttons in the action bar.
    expect(
      await harness.page.evaluate(() => ({
        actionBar: ['Preview course', 'Publish'].map((label) =>
          Boolean(document.querySelector(`[data-slot=page-action-bar] [aria-label="${label}"], [data-slot=page-action-bar] [aria-label^="Commit new version from drafts"]`)),
        ),
        toolbar: Boolean(document.querySelector('[data-slot=page-toolbar] [aria-label="Preview course"]')),
      })),
    ).toEqual({ actionBar: [true, true], toolbar: false })
    // Explorer on the left, Versions on the right, each a card with its title inside.
    expect(rows.sidePanels).toEqual([
      { side: 'left', title: 'Explorer' },
      { side: 'right', title: 'Versions' },
    ])
  })
})

// SLJ-26: on narrow windows the editor's side panels (< 1280px) and the app
// sidebar (< 1024px) become drawers that start closed, without touching the
// saved wide-window panel state.
describe('narrow windows', () => {
  const setWidth = (width) =>
    harness.app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setContentSize(w, 900), width)
  const layout = () =>
    harness.page.evaluate(() => ({
      inlinePanels: document.querySelectorAll('[data-slot=page-side-panel]').length,
      sidebarLinks: document.querySelectorAll('[data-sidebar=menu-button]').length,
    }))

  it('turns the side panels and then the app sidebar into closed drawers', async () => {
    const { page } = harness
    const panelsBefore = await page.evaluate(() =>
      window.preferences.get().then((p) => [p.explorerPanel ?? null, p.versionsPanel ?? null]),
    )
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, probeCourseId)
    await page.locator('[data-slot=page-action-bar]').waitFor()

    try {
      await setWidth(1100)
      await expect.poll(async () => (await layout()).inlinePanels).toBe(0)
      expect((await layout()).sidebarLinks).toBeGreaterThan(0)

      // The explorer opens as a drawer from its toggle.
      await page.getByRole('button', { name: 'Show or hide explorer' }).click()
      await page.getByRole('dialog', { name: 'Explorer' }).waitFor()
      await page.keyboard.press('Escape')

      await setWidth(960)
      await expect.poll(async () => (await layout()).sidebarLinks).toBe(0)

      await setWidth(1440)
      await expect.poll(async () => (await layout()).inlinePanels).toBe(2)
      expect((await layout()).sidebarLinks).toBeGreaterThan(0)

      const panelsAfter = await page.evaluate(() =>
        window.preferences.get().then((p) => [p.explorerPanel ?? null, p.versionsPanel ?? null]),
      )
      expect(panelsAfter).toEqual(panelsBefore)
    } finally {
      await setWidth(1440)
    }
  })
})

describe('learner flow: attend a course and complete its test', () => {
  let attendCourseId
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
    expect(draft.courseId).toMatch(COURSE_ID_PATTERN)
    attendCourseId = draft.courseId

    const section = await harness.page.evaluate(
      (id) => window.courses.createSection({ courseId: id, title: 'E2E Attend Section' }),
      attendCourseId,
    )
    sectionId = section.sectionId

    const lesson = await harness.page.evaluate(
      ({ id, sectionId }) =>
        window.courses.createLesson({ courseId: id, sectionId, title: 'E2E Attend Lesson' }),
      { id: attendCourseId, sectionId },
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
                // One placeholder with spaces inside the braces: both forms must
                // be filled in (they once weren't, and `{{ a }}` showed literally).
                locales: { en: { prompt: 'What is {{ a }} plus {{b}}?' } },
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
      { id: attendCourseId, sectionId, lessonId },
    )

    const testPath = path.join(
      USER_DATA,
      'courses',
      attendCourseId,
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
      { id: attendCourseId, lessonId },
    )
    await waitForText(harness.page, 'Continue')

    expect(await clickText(harness.page, 'Continue')).toContain('OK')
    await waitForText(harness.page, 'Check answer')
    expect(await bodyText(harness.page)).toContain('What is 4 plus 3?')

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

// SLJ-19: BlockNote's markdown import read a hard line break back with a space
// after it, so a pasted multi-line paragraph gained a leading space on lines 2+
// every time it was saved and reopened.
describe('lesson editor line breaks', () => {
  it('keeps a pasted multi-line paragraph unchanged across save and reopen', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Line Breaks' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Line breaks lesson' })
      return { courseId, lessonId }
    })
    const draftDir = path.join(USER_DATA, 'courses', ids.courseId, 'draft')
    const lessonFile = () =>
      path.join(
        draftDir,
        fs.readdirSync(draftDir, { recursive: true }).map(String).find((file) => file.endsWith(`${ids.lessonId}.md`)),
      )
    const openLesson = async () => {
      await page.evaluate((id) => {
        location.hash = `#/drafts/${id}`
      }, ids.courseId)
      await waitFor(page, () =>
        [...document.querySelectorAll('span,button,div')].some((el) => el.textContent === 'Line breaks lesson'),
      )
      await page.evaluate(() =>
        [...document.querySelectorAll('span,button,div')]
          .filter((el) => el.textContent === 'Line breaks lesson')
          .pop()
          .click(),
      )
      // The editor element mounts before the lesson is loaded into it; wait
      // until it is editable and shows the lesson's heading.
      await waitFor(page, () => {
        const editor = document.querySelector('.bn-editor')
        return editor?.getAttribute('contenteditable') === 'true' && editor.innerText.includes('Document title')
      })
    }
    // Autosave writes in the background; poll the file on disk until it matches.
    const waitForFile = (predicate) =>
      expect
        .poll(() => fs.readFileSync(lessonFile(), 'utf8'), { interval: 250, timeout: 15_000 })
        .toSatisfy(predicate)
        .then(() => fs.readFileSync(lessonFile(), 'utf8'))

    // Paste three lines into a new paragraph under the lesson's heading.
    await openLesson()
    await page.click('.bn-editor')
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.evaluate(() => {
      const data = new DataTransfer()
      data.setData('text/plain', 'first line\nsecond line\nthird line')
      document.activeElement.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
      )
    })
    const saved = await waitForFile((text) => text.includes('third line'))
    expect(saved).toContain('first line\\\nsecond line\\\nthird line')

    // Reopen: the editor must show the lines as pasted, with no leading spaces.
    await page.reload()
    await openLesson()
    const shown = await page.evaluate(() => document.querySelector('.bn-editor').innerText)
    expect(shown).toContain('first line\nsecond line\nthird line')
  })
})

// A version needs at least one section, and every section a lesson or test.
// The action bar's Publish (which commits the drafts first) is disabled until
// then, and says why; a draft may be empty.
describe('commit needs sections with content', () => {
  it('disables Publish with the reason until every section has a lesson', async () => {
    const { page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Empty Course' } },
        supportedLocales: ['en'],
      })
      return courseId
    })
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    const commitButton = page.locator('[data-testid="publish-course"]')
    await commitButton.waitFor()

    // Hover until the tooltip shows the reason; after a reload the course's
    // structure (and so the reason) may still be loading for a moment.
    const expectReasonOnHover = (reason) =>
      expect
        .poll(
          async () => {
            await page.mouse.move(0, 0)
            await commitButton.hover({ force: true })
            await page.waitForTimeout(300)
            return bodyText(page)
          },
          { interval: 200, timeout: 10_000 },
        )
        .toContain(reason)

    expect(await commitButton.isDisabled()).toBe(true)
    await expectReasonOnHover('Add a section with at least one lesson before committing a version.')

    const sectionId = await page.evaluate(
      (id) => window.courses.createSection({ courseId: id, title: 'Empty section' }).then((result) => result.sectionId),
      courseId,
    )
    await page.reload()
    await commitButton.waitFor()
    expect(await commitButton.isDisabled()).toBe(true)
    await expectReasonOnHover('Section "Empty section" has no lessons or tests yet.')

    await page.evaluate(
      ({ courseId, sectionId }) => window.courses.createLesson({ courseId, sectionId, title: 'First lesson' }),
      { courseId, sectionId },
    )
    await page.reload()
    await commitButton.waitFor()
    await expect.poll(() => commitButton.isDisabled()).toBe(false)
    expect(await commitButton.getAttribute('aria-label')).toBe('Commit new version from drafts and publish')
  })
})

// SLJ-45: a section's summary (one line, for lists) and intro (a page students
// see first when they start the section).
describe('section summary and intro', () => {
  it('a teacher adds both, a student sees the summary and starts with the intro, and removing asks first', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Intro Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Intro section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'First lesson' })
      await window.courses.updateLessonContent({
        courseId,
        lessonId,
        locales: { en: { body: '[matko-block]: <> (markdown)\nLesson one text.' } },
        sectionId,
      })
      return { courseId, lessonId, sectionId }
    })
    const sectionDir = path.join(USER_DATA, 'courses', ids.courseId, 'draft', ids.sectionId)
    const openSectionPage = async () => {
      await page.evaluate((id) => {
        location.hash = `#/drafts/${id}`
      }, ids.courseId)
      await waitFor(page, () =>
        [...document.querySelectorAll('span,button,div')].some((el) => el.textContent === 'Intro section'),
      )
      await page.evaluate(() =>
        [...document.querySelectorAll('span,button,div')].filter((el) => el.textContent === 'Intro section').pop().click(),
      )
      await page.getByLabel('Section summary').waitFor()
    }

    // Teacher: summary, then intro.
    await openSectionPage()
    await page.getByLabel('Section summary').fill('Everything about the intro section.')
    await page.click('[data-testid="add-section-intro"]')
    await waitFor(page, () => document.querySelector('.bn-editor[contenteditable="true"]') !== null)
    await page.click('.bn-editor')
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Welcome to this section.')
    await expect
      .poll(() => fs.readFileSync(path.join(sectionDir, 'locales', 'en', 'intro.md'), 'utf8'), { timeout: 15_000 })
      .toContain('Welcome to this section.')
    await expect
      .poll(() => JSON.parse(fs.readFileSync(path.join(sectionDir, 'section.json'), 'utf8')).locales.en.description, {
        timeout: 15_000,
      })
      .toBe('Everything about the intro section.')

    // Student: the summary on the course page; Start course opens the intro,
    // Continue goes to the first lesson.
    await page.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, ids.courseId)
    await waitForText(page, 'Everything about the intro section.')
    expect(await bodyText(page)).toContain('Introduction')
    await page.getByRole('button', { name: 'Start course' }).first().click()
    await waitForText(page, 'Welcome to this section.')
    expect(await page.evaluate(() => location.hash)).toContain('/lessons/intro-')
    // The intro isn't counted as a lesson.
    expect(await bodyText(page)).toContain('Intro section · Introduction')
    expect(await clickText(page, 'Continue')).toContain('OK')
    await waitForText(page, 'Lesson one text.')
    expect(await bodyText(page)).toContain('Intro section · Lesson 1 of 1')

    // Teacher: removing an intro that was never committed says it's gone for good.
    await openSectionPage()
    await page.click('[data-testid="remove-section-intro"]')
    await waitForText(page, "It hasn't been committed in any version, so it can't be recovered.")
    await page.click('[data-testid="confirm-remove-section-intro"]')
    await waitFor(page, () => document.querySelector('[data-testid="add-section-intro"]') !== null)
    expect(fs.existsSync(path.join(sectionDir, 'locales', 'en', 'intro.md'))).toBe(false)
  })
})

// SLJ-37: a teacher defines a mnemonic once on the course form; the lesson
// shows it after the first N places the term appears, and the student can
// switch mnemonics off. Lesson text itself never changes.
describe('course mnemonics', () => {
  it('a teacher adds one in the course form, and a student sees it in the lesson and can hide it', async () => {
    const { page } = harness
    const body = '[matko-block]: <> (markdown)\nJohn Newbery wrote books. Later John Newbery sold them. John Newbery again.'
    const ids = await page.evaluate(async (body) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Mnemonics Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Authors' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Newbery' })
      await window.courses.updateLessonContent({ courseId, lessonId, locales: { en: { body } }, sectionId })
      return { courseId, lessonId }
    }, body)
    const manifestPath = path.join(USER_DATA, 'courses', ids.courseId, 'draft', 'course.json')

    // Teacher: the course form's Mnemonics section.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.getByRole('button', { name: 'Mnemonics', exact: true }).click()
    await page.getByRole('button', { name: 'Add mnemonic' }).click()
    await page.getByLabel('Term', { exact: true }).fill('John Newbery')
    await page.getByLabel('Mnemonic', { exact: true }).fill('John 📰🍓')
    await page.getByLabel('Mark the first N places in a lesson (3 if empty)').fill('2')
    await expect
      .poll(() => JSON.parse(fs.readFileSync(manifestPath, 'utf8')).locales.en.mnemonics, { timeout: 15_000 })
      .toEqual([{ mnemonic: 'John 📰🍓', showFirst: 2, term: 'John Newbery' }])

    // Student: the badge after the first two places only; the lesson file is unchanged.
    const badges = () => page.locator('[data-testid="mnemonic"]').count()
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}`
    }, ids)
    await waitForText(page, 'John Newbery again.')
    await expect.poll(badges).toBe(2)
    // The term is marked; hovering shows the mnemonic, and a screen reader hears it.
    await page.locator('[data-testid="mnemonic"]').first().hover()
    await page.locator('[data-testid="mnemonic-tooltip"]').waitFor()
    expect(await page.locator('[data-testid="mnemonic-tooltip"]').innerText()).toBe('John 📰🍓')
    expect(await page.locator('[data-testid="mnemonic"] .sr-only').first().textContent()).toBe('Mnemonic: John 📰🍓')
    const draftDir = path.dirname(manifestPath)
    const sectionDir = path.join(draftDir, fs.readdirSync(draftDir).find((name) => name.startsWith('section-')))
    const lessonText = fs
      .readdirSync(path.join(sectionDir, 'locales', 'en'))
      .map((name) => fs.readFileSync(path.join(sectionDir, 'locales', 'en', name), 'utf8'))
      .join('\n')
    expect(lessonText).toContain('John Newbery again.')
    expect(lessonText).not.toContain('📰')

    // Teacher: the same terms are marked while writing the lesson.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await waitFor(page, () => [...document.querySelectorAll('span,button,div')].some((el) => el.textContent === 'Newbery'))
    await page.evaluate(() =>
      [...document.querySelectorAll('span,button,div')].filter((el) => el.textContent === 'Newbery').pop().click(),
    )
    await expect.poll(() => page.locator('[data-testid="editor-mnemonic"]').count(), { timeout: 15_000 }).toBe(2)
    expect(await page.locator('[data-testid="editor-mnemonic"]').first().getAttribute('data-mnemonic')).toBe('John 📰🍓')

    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}`
    }, ids)
    await waitForText(page, 'John Newbery again.')

    try {
      await page.click('[data-testid="toggle-mnemonics"]')
      await expect.poll(badges).toBe(0)
      expect((await page.evaluate(() => window.preferences.get())).showMnemonics).toBe(false)
      await page.click('[data-testid="toggle-mnemonics"]')
      await expect.poll(badges).toBe(2)
    } finally {
      await page.evaluate(() => window.preferences.set({ showMnemonics: true }))
    }
  })
})

// SLJ-36: a lesson written by a newer app version can contain block types this
// version doesn't know. The rest of the lesson must still show, the student is
// told something is missing, and saving in the editor keeps the block as is.
describe('lessons from a newer app version', () => {
  const unknownBlock = '[matko-block]: <> (timeline-milestone)\n{"label":"1066","caption":"Battle of Hastings"}'
  const body = [
    '[matko-block]: <> (heading)\n## Newer lesson',
    unknownBlock,
    '[matko-block]: <> (markdown)\nText after the unknown block.',
  ].join('\n\n')
  let ids

  it('keeps an unknown block unchanged when the lesson is edited and saved', async () => {
    const { page } = harness
    ids = await page.evaluate(async (body) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Newer Version' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Newer version lesson' })
      await window.courses.updateLessonContent({ courseId, lessonId, locales: { en: { body } }, sectionId })
      return { courseId, lessonId }
    }, body)
    const draftDir = path.join(USER_DATA, 'courses', ids.courseId, 'draft')
    const lessonFile = path.join(
      draftDir,
      fs.readdirSync(draftDir, { recursive: true }).map(String).find((file) => file.endsWith(`${ids.lessonId}.md`)),
    )

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await waitFor(page, () =>
      [...document.querySelectorAll('span,button,div')].some((el) => el.textContent === 'Newer version lesson'),
    )
    await page.evaluate(() =>
      [...document.querySelectorAll('span,button,div')]
        .filter((el) => el.textContent === 'Newer version lesson')
        .pop()
        .click(),
    )
    await waitFor(page, () => {
      const editor = document.querySelector('.bn-editor')
      return editor?.getAttribute('contenteditable') === 'true' && editor.innerText.includes('Text after the unknown block.')
    })
    expect(await bodyText(page)).toContain('Content from a newer version of Matko')

    // Type at the end of the lesson so autosave writes it back to disk.
    await page.click('.bn-editor')
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End')
    await page.keyboard.press('End')
    await page.keyboard.type(' Edited.')
    const saved = await expect
      .poll(() => fs.readFileSync(lessonFile, 'utf8'), { interval: 250, timeout: 15_000 })
      .toContain('Edited.')
      .then(() => fs.readFileSync(lessonFile, 'utf8'))
    expect(saved).toContain(unknownBlock)
  })

  it('shows the rest of the lesson to a student, with a dismissible notice', async () => {
    const { page } = harness
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}`
    }, ids)
    await waitFor(page, () => document.querySelector('[data-testid="unsupported-content-notice"]') !== null)

    const text = await bodyText(page)
    expect(text).toContain('Part of this lesson needs a newer version of Matko')
    expect(text).toContain('Text after the unknown block. Edited.')
    expect(text).not.toContain('Battle of Hastings')

    await page.click('[data-testid="unsupported-content-notice"] button[aria-label="Dismiss"]')
    await waitFor(page, () => document.querySelector('[data-testid="unsupported-content-notice"]') === null)

    // Leave the player's BlankLayout so later describe blocks land on normal app chrome.
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await waitForText(page, 'English')
  })
})

// Removing a course lives in the course's own ⋯ menu (end of the action bar),
// not on list rows or cards.
describe('remove a course', () => {
  it("removes a course from the editor's course menu and returns to My courses", async () => {
    const { page } = harness
    const { courseId } = await page.evaluate(() =>
      window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Remove Me' } },
        supportedLocales: ['en'],
      }),
    )

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    await page.getByRole('button', { name: 'Course actions for E2E Remove Me' }).click()
    await page.getByRole('menuitem', { name: 'Remove course' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click()

    await waitForUrl(page, '#/my-courses')
    const ids = (await page.evaluate(() => window.courses.list('en'))).map((course) => course.id)
    expect(ids).not.toContain(courseId)
  })
})

// SLJ-28: reverting replaces the draft, so it asks first when the draft has
// uncommitted changes, and reverts directly when it doesn't.
describe('revert confirmation', () => {
  it('asks before reverting over uncommitted changes, and not otherwise', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Revert' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      await window.courses.createLesson({ courseId, sectionId, title: 'First' })
      const first = await window.courses.cutVersion({ courseId, releaseType: 'patch' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Second' })
      const second = await window.courses.cutVersion({ courseId, releaseType: 'patch' })
      // An uncommitted change on top of the second version.
      await window.courses.updateDraftMetadata({
        contentRating: 'all-ages',
        courseId,
        defaultLocale: 'en',
        descriptiveTags: [],
        locales: { en: { description: '', title: 'E2E Revert (edited)' } },
        supportedLocales: ['en'],
      })
      return { courseId, first: first.version, second: second.version }
    })
    const history = () => page.evaluate((id) => window.courses.getVersionHistory(id), ids.courseId)
    const revertFromPanel = async (version) => {
      const row = page.locator('[data-slot=list-row]').filter({ hasText: new RegExp(`^${version.replaceAll('.', '\\.')}`) })
      await row.click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Revert to this version' }).click()
    }

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.locator('[data-slot=list-row]').filter({ hasText: /^Draft/ }).waitFor()

    // Uncommitted changes: it asks. Cancel keeps the draft as it is.
    await revertFromPanel(ids.first)
    const dialog = page.getByRole('dialog')
    await dialog.getByText(`Revert to ${ids.first}?`).waitFor()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    expect((await history()).currentDraftVersion).toBe(ids.second)

    // Confirm: it reverts.
    await revertFromPanel(ids.first)
    await page.getByRole('dialog').getByRole('button', { name: 'Revert' }).click()
    await expect.poll(async () => (await history()).currentDraftVersion).toBe(ids.first)

    // No uncommitted changes now: it reverts straight away, no dialog.
    await revertFromPanel(ids.second)
    await expect.poll(async () => (await history()).currentDraftVersion).toBe(ids.second)
    expect(await page.getByRole('dialog').count()).toBe(0)
  })
})

// SLJ-30: the bundled course can be hidden from Home (Settings, or Hide in its
// own ⋯ menu) and brought back; hiding never deletes it.
describe('show Getting Started course', () => {
  it('hides the bundled course from Home and brings it back', async () => {
    const { page } = harness
    const homeShows = (title) =>
      page.evaluate((t) => {
        location.hash = '#/'
        return new Promise((resolve) => setTimeout(() => resolve(document.body.innerText.includes(t)), 600))
      }, title)

    try {
      // Hide it from its own menu on the course details page.
      await page.evaluate((id) => {
        location.hash = `#/courses/${id}`
      }, BUNDLED_COURSE_ID)
      await page.getByRole('button', { name: 'Course actions for Getting Started with Matko' }).click()
      await page.getByRole('menuitem', { name: 'Hide course' }).click()
      await waitForUrl(page, '#/')
      expect(await homeShows('Getting Started with Matko')).toBe(false)
      expect((await page.evaluate(() => window.preferences.get())).showBundledCourses).toBe(false)
      // Not deleted: still in the course list.
      const ids = (await page.evaluate(() => window.courses.list('en'))).map((c) => c.id)
      expect(ids).toContain(BUNDLED_COURSE_ID)

      // Bring it back from Settings.
      await page.evaluate(() => {
        location.hash = '#/settings'
      })
      await page.locator('label[for="settings-show-bundled-courses"]').click()
      await expect.poll(async () => (await page.evaluate(() => window.preferences.get())).showBundledCourses).toBe(true)
      expect(await homeShows('Getting Started with Matko')).toBe(true)
    } finally {
      await page.evaluate(() => window.preferences.set({ showBundledCourses: true }))
    }
  })
})

// SLJ-27 / SLJ-29: the Commit dialog previews what changed, warns about
// missing files, and saves the author's notes into the version's changelog,
// which the Versions panel shows when a version is expanded.
describe('release notes', () => {
  it('previews changes, warns about missing files, and keeps the notes', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Release Notes' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Numbers' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Addition' })
      const first = await window.courses.cutVersion({ courseId, releaseType: 'patch' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Subtraction' })
      // A lesson that refers to a file that doesn't exist.
      await window.courses.updateLessonContent({
        courseId,
        lessonId,
        locales: { en: { body: '![Gone](diagram-0123456789abcdef.svg)' } },
        sectionId,
      })
      return { courseId, first: first.version }
    })

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    // Commit without publishing lives in the course's ⋯ menu.
    await page.getByRole('button', { name: /^Course actions for / }).click()
    await page.locator('[data-testid="commit-new-version"]').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText(`Changes since ${ids.first}`).waitFor()
    expect(await dialog.innerText()).toContain('Added lesson "Subtraction" in "Numbers"')
    expect(await dialog.innerText()).toContain('diagram-0123456789abcdef.svg, used in lesson "Addition" in "Numbers"')

    await dialog.getByLabel('Release notes').fill('Added subtraction.')
    await dialog.locator('label[for="commit-recommended"]').click()
    await dialog.getByRole('button', { name: 'Cut new version' }).click()
    await expect
      .poll(() => page.evaluate((id) => window.courses.getVersionHistory(id).then((h) => h.changelog.length), ids.courseId))
      .toBe(2)
    await page.keyboard.press('Escape')

    const history = await page.evaluate((id) => window.courses.getVersionHistory(id), ids.courseId)
    expect(history.changelog[0]).toMatchObject({ notes: 'Added subtraction.', recommended: true })
    expect(history.changelog[0].changes).toContainEqual({
      kind: 'added',
      section: 'Numbers',
      target: 'lesson',
      title: 'Subtraction',
    })

    // The version's context menu opens its release notes in a dialog.
    const newest = history.changelog[0].version
    await page
      .locator('[data-slot=list-row]')
      .filter({ hasText: new RegExp(`^${newest.replaceAll('.', '\\.')}`) })
      .click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Show release notes' }).click()
    const notesDialog = page.getByRole('dialog', { name: `Release notes · ${newest}` })
    await notesDialog.getByText('Added subtraction.').waitFor()
    expect(await notesDialog.innerText()).toContain('Recommended update')
    expect(await notesDialog.innerText()).toContain('Added lesson "Subtraction" in "Numbers"')
  })
})

// Discarding changes (the Draft row's context menu) asks first, then puts the
// draft back to the version it's based on.
describe('discard changes', () => {
  it('asks, then clears the draft back to its current version', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Discard' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Kept' })
      const cut = await window.courses.cutVersion({ courseId, releaseType: 'patch' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Thrown away' })
      return { courseId, version: cut.version }
    })
    const history = () => page.evaluate((id) => window.courses.getVersionHistory(id), ids.courseId)
    const openDiscard = async () => {
      await page.locator('[data-slot=list-row]').filter({ hasText: /^Draft/ }).click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Discard changes' }).click()
    }

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.locator('[data-slot=list-row]').filter({ hasText: /^Draft/ }).waitFor()
    expect((await history()).draftMatchesCurrentVersion).toBe(false)

    await openDiscard()
    await page.getByRole('dialog').getByText(`Discard changes since ${ids.version}?`).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    expect((await history()).draftMatchesCurrentVersion).toBe(false)

    // The same, from the course's ⋯ menu (red, above Remove course).
    await page.getByRole('button', { name: /^Course actions for / }).click()
    await page.getByRole('menuitem', { name: 'Remove course' }).waitFor()
    const menuItems = await page.getByRole('menuitem').allInnerTexts()
    expect(menuItems.slice(-2)).toEqual(['Discard changes', 'Remove course'])
    await page.locator('[data-testid="discard-changes"]').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click()
    await expect.poll(async () => (await history()).draftMatchesCurrentVersion).toBe(true)
    // Nothing left to discard: the item is gone.
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /^Course actions for / }).click()
    await page.getByRole('menuitem', { name: 'Remove course' }).waitFor()
    expect(await page.locator('[data-testid="discard-changes"]').count()).toBe(0)
    await page.keyboard.press('Escape')
    expect((await history()).currentDraftVersion).toBe(ids.version)
    const lessons = await page.evaluate(
      (id) => window.courses.get(id, 'en').then((c) => c.sections[0].lessons.map((l) => l.title)),
      ids.courseId,
    )
    expect(lessons).toEqual(['Kept'])
  })

  // SLJ-17: choosing a source script regenerates the other one, after asking,
  // and its language tab shows a notice instead of its fields.
  it('generates Cyrillic from Latin once chosen in the course settings', async () => {
    const { page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'sr',
        locales: {
          sr: { description: '', title: 'Brojevi' },
          'sr-Cyrl': { description: '', title: 'Ручно' },
        },
        supportedLocales: ['sr', 'sr-Cyrl'],
      })
      return courseId
    })
    const course = () => page.evaluate((id) => window.courses.get(id, 'sr'), courseId)

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    await page.getByRole('button', { name: 'Serbian scripts', expanded: true }).waitFor()
    await page.getByText('Write in Latin, Cyrillic generated').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Generate Cyrillic' }).click()

    await expect.poll(async () => (await course()).serbianScript, { timeout: 10_000 }).toEqual({ source: 'sr' })
    expect((await course()).locales['sr-Cyrl'].title).toBe('Бројеви')

    await page.getByRole('tab', { name: /Српски/ }).click()
    await page.getByText('Generated from the Latin text').waitFor()
    await page.getByRole('button', { name: 'Edit Latin' }).click()
    await page.locator('#draft-course-title-sr').waitFor()

    // Leave the course: its language picker would otherwise be what the i18n
    // tests below find when they look for "English".
    await page.evaluate(() => {
      location.hash = '#/'
    })
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

  // The vendored `SidebarTrigger`/`SidebarRail` in src/components/ui/sidebar.tsx
  // still carry a hardcoded "Toggle Sidebar", but neither is rendered anymore —
  // the sidebar toggle lives in the window title bar, labelled through i18next
  // (`titleBar.toggleSidebar`). check:i18n can't catch a literal coming back
  // (it only compares key parity between locale files); this can.
  it('shows no untranslated "Toggle Sidebar" literal', async () => {
    expect(await bodyText(harness.page)).not.toContain('Toggle Sidebar')
  })
})

// SLJ-48: the window only ever shows the app. Course content comes from other
// people, and a page in this window gets the preload's bridges.
describe('window lockdown', () => {
  it('opens outside links in the browser, never in the app window, and blocks other targets', async () => {
    const { app, page } = harness
    // Record instead of opening a real browser.
    await app.evaluate(({ shell }) => {
      globalThis.__openedExternal = []
      shell.openExternal = async (url) => {
        globalThis.__openedExternal.push(url)
      }
    })
    const appUrl = await page.evaluate(() => location.href.split('#')[0])
    const windowCountBefore = app.windows().length

    // window.open: refused; an http(s) page goes to the browser.
    expect(await page.evaluate(() => window.open('https://example.com/new-window') === null)).toBe(true)

    // A clicked link (as in a lesson): the window stays on the app.
    await page.evaluate(() => {
      const link = document.createElement('a')
      link.href = 'https://example.com/clicked-link'
      document.body.append(link)
      link.click()
      link.remove()
    })

    // Other schemes and files on disk: blocked outright, not sent anywhere.
    await page.evaluate(() => {
      for (const href of ['file:///etc/hosts', 'data:text/html,<p>hi</p>']) {
        const link = document.createElement('a')
        link.href = href
        document.body.append(link)
        link.click()
        link.remove()
      }
    })

    await expect
      .poll(() => app.evaluate(() => globalThis.__openedExternal))
      .toEqual(['https://example.com/new-window', 'https://example.com/clicked-link'])
    expect(await page.evaluate(() => location.href.split('#')[0])).toBe(appUrl)
    expect(app.windows().length).toBe(windowCountBefore)
  })

  it('allows clipboard writes and denies other permissions', async () => {
    const { page } = harness
    await page.bringToFront()

    expect(await page.evaluate(() => navigator.clipboard.writeText('matko').then(() => 'ok', (error) => String(error)))).toBe(
      'ok',
    )
    expect(await page.evaluate(() => Notification.requestPermission())).toBe('denied')
  })
})

describe('runtime health', () => {
  it('logged no uncaught renderer errors', () => {
    expect(harness.errors).toEqual([])
  })
})
