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
  profileDataDir,
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
import { recordFailures } from './failures.mjs'

const USER_DATA = '/tmp/matko-e2e-vitest'
// Where the app keeps its data: the e2e profile's folder (SLJ-57).
const DATA_DIR = profileDataDir(USER_DATA)
const NICKNAME = 'Quacky McDuck'

let harness
recordFailures(import.meta.filename, () => ({ app: harness }))

beforeAll(async () => {
  harness = await launchApp({ userData: USER_DATA, fresh: true })
}, 120_000)

afterAll(async () => {
  await harness?.close()
})

describe('launch', () => {
  it('starts at onboarding with the UI mounted', async () => {
    // The redirect follows once the profile and its preferences have loaded.
    await waitForUrl(harness.page, '#/onboarding')
    expect(harness.page.url()).toContain('#/onboarding')
    const childCount = await harness.page.evaluate(
      () => document.getElementById('root').childElementCount,
    )
    expect(childCount).toBeGreaterThan(0)
  })

  // The bundled emoji font (src/assets/fonts/noto-color-emoji) must be one
  // Chromium can draw: a font it picks but can't draw (OpenType-SVG) leaves
  // every emoji blank while still taking its space. So draw a flag with it
  // and count the colored pixels.
  it('draws emoji in color with the bundled font', async () => {
    const colored = await harness.page.evaluate(async () => {
      const [face] = await document.fonts.load('48px "Noto Color Emoji"', '🇬🇧')
      if (!face) return -1
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 64
      const context = canvas.getContext('2d')
      context.font = '48px "Noto Color Emoji"'
      context.textBaseline = 'top'
      context.fillText('🇬🇧', 0, 0)
      const { data } = context.getImageData(0, 0, 64, 64)
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, alpha] = data.slice(i, i + 4)
        // Opaque and not gray: color only a color font gives.
        if (alpha > 200 && Math.max(r, g, b) - Math.min(r, g, b) > 60) count++
      }
      return count
    })
    expect(colored).toBeGreaterThan(200)
  })

  // Contract 1 in docs/contracts.md: preload.ts and electron-env.d.ts are
  // hand-maintained mirrors of each other with nothing verifying they agree.
  // This is the only automated check that they do.
  it('exposes the full preload bridge surface', async () => {
    const surface = await harness.page.evaluate(() => ({
      background: Object.keys(window.background ?? {}).sort(),
      channels: Object.keys(window.channels ?? {}).sort(),
      courses: Object.keys(window.courses ?? {}).sort(),
      maintainers: Object.keys(window.maintainers ?? {}).sort(),
      mcp: Object.keys(window.mcp ?? {}).sort(),
      preferences: Object.keys(window.preferences ?? {}).sort(),
      profiles: Object.keys(window.profiles ?? {}).sort(),
      programs: Object.keys(window.programs ?? {}).sort(),
      progress: Object.keys(window.progress ?? {}).sort(),
      publishers: Object.keys(window.publishers ?? {}).sort(),
      sharing: Object.keys(window.sharing ?? {}).sort(),
    }))

    expect(surface.background).toEqual(['isSupported', 'onAskKeepSharing'])
    expect(surface.channels).toEqual(['getForCourse', 'own', 'setCourseListed'])
    expect(surface.mcp).toEqual(['getStatus', 'onChanged', 'regenerateToken', 'setEnabled'])
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
      'getDiskUsage',
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
      'updateLessonMetadata',
      'updateSection',
      'updateSectionIntro',
      'updateSectionTestMetadata',
      'uploadAsset',
      'uploadAssetBytes',
    ])
    expect(surface.maintainers).toEqual([
      'accept',
      'approve',
      'get',
      'invite',
      'listApprovals',
      'preview',
      'proposeChange',
      'requestChanges',
      'review',
      'startSharing',
      'withdraw',
    ])
    expect(surface.preferences).toEqual(['get', 'resetOnboarding', 'set'])
    expect(surface.publishers).toEqual(['list', 'remove', 'save'])
    expect(surface.programs).toEqual(['create', 'get', 'getSharing', 'list', 'markSeen', 'peekCourse', 'publish', 'remove', 'update', 'uploadImage'])
    expect(surface.progress).toEqual(['clearCourse', 'get', 'recordFirstTry', 'recordOpened', 'recordStepDone', 'recordTestResult', 'setFavorite', 'setProgramFavorite'])
    expect(surface.profiles).toEqual(['create', 'getRemovalSummary', 'getState', 'open', 'openCoursesFolder', 'removeCurrent', 'switchProfile'])
    expect(surface.sharing).toEqual([
      'applyCourseUpdate',
      'cancelTransfer',
      'chooseIdentityFile',
      'finishOnVersion',
      'getCourseSharing',
      'getCreatorKey',
      'getIdentityRestoreStatus',
      'getIdentityStatus',
      'getTransfer',
      'importCourse',
      'listCourseUpdates',
      'listImports',
      'openWithoutPublishing',
      'restoreIdentity',
      'revealIdentityFile',
      'searchRestoredCourses',
      'setUpIdentity',
      'switchCourseVersion',
      'unlockIdentity',
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
    expect(await sidebarLinkTexts()).toEqual(['Home', 'Publishers'])

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
    expect(await sidebarLinkTexts()).toEqual(['Home', 'My courses', 'My programs', 'My channel', 'Publishers'])
    const prefs = await harness.page.evaluate(() => window.preferences.get())
    expect(prefs.role).toBe('teacher')

    // Leave the app on Home, where the next suite starts.
    await harness.page.evaluate(() => {
      location.hash = '#/'
    })
  })
})

// SLJ-108: Publishers, the address book of Publisher IDs.
describe('publishers', () => {
  const MILA = 'm'.repeat(52)

  it('adds a publisher by hand, renames it, and removes it', async () => {
    const page = harness.page
    await page.evaluate(() => {
      location.hash = '#/publishers'
    })
    await waitForText(page, 'No publishers yet.')

    await page.click('[data-testid="add-publisher"]')
    await page.fill('[data-testid="publisher-new-id"]', 'not an id')
    await page.click('[data-testid="publisher-save"]')
    await waitFor(page, () => document.querySelector('[data-testid="publisher-dialog"] [role="alert"]') !== null)
    await page.fill('[data-testid="publisher-new-id"]', MILA)
    await page.fill('[data-testid="publisher-label"]', 'Mila (math)')
    await page.click('[data-testid="publisher-save"]')
    await waitFor(page, () => document.querySelector('[data-testid="publisher"]')?.textContent?.includes('Mila (math)'))
    expect(await page.locator('[data-testid="publisher"]').innerText()).toContain('Added by you')
    // The id shortened, with a button that copies it whole.
    expect(await page.locator('[data-testid="publisher-short-id"]').innerText()).toBe('mmmmmmmm…')
    await page.locator('[data-testid="publisher-copy-id"]').waitFor()

    // Open it: its id to copy, a new name.
    await page.locator('[data-testid="publisher-name"]').click()
    expect(await page.locator('[data-testid="publisher-id"]').inputValue()).toBe(MILA)
    await page.fill('[data-testid="publisher-label"]', 'Mila')
    await page.click('[data-testid="publisher-save"]')
    await waitFor(page, () => document.querySelector('[data-testid="publisher-name"]')?.textContent === 'Mila')
    expect(await page.evaluate(() => window.publishers.list('en'))).toMatchObject([{ label: 'Mila', publisherId: MILA }])

    await page.locator('[data-testid="publisher-name"]').click()
    await page.click('[data-testid="publisher-remove"]')
    await waitForText(page, 'No publishers yet.')

    await page.evaluate(() => {
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
      DATA_DIR,
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
    const assetsDir = path.join(DATA_DIR, 'courses', probeCourseId, 'draft', 'assets')
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
    const courseRoot = path.join(DATA_DIR, 'courses', importedId)
    const assetsDir = path.join(courseRoot, 'versions', '1.0', 'assets')
    fs.mkdirSync(assetsDir, { recursive: true })
    fs.writeFileSync(path.join(courseRoot, 'release.json'), JSON.stringify({ publishedVersion: '1.0' }))
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
    expect(result.version).toBe('0.2')

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    const course = courses.find((c) => c.id === probeCourseId)

    expect(course.versionBadge).toEqual({ kind: 'version', version: '0.2' })
  })

  it('shows "draft" again once real content changes past the last cut', async () => {
    // An edit to `course.json` itself (version/updatedAt bookkeeping) does NOT
    // count — that file is deliberately excluded from the comparison (see
    // computeCourseVersionBadge in electron/course-registry.ts) since a cut
    // always rewrites it. Edit the lesson file created in "course assets"
    // instead, a real content file.
    const sectionDir = fs
      .readdirSync(path.join(DATA_DIR, 'courses', probeCourseId, 'draft'))
      .find((name) => name.startsWith('section-'))
    const lessonPath = fs
      .readdirSync(path.join(DATA_DIR, 'courses', probeCourseId, 'draft', sectionDir))
      .filter((name) => name.startsWith('lesson-'))
      .map((name) => path.join(DATA_DIR, 'courses', probeCourseId, 'draft', sectionDir, name))[0]
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
    // Open as student, Commit new version and Publish are round icon buttons in the action bar.
    expect(
      await harness.page.evaluate(() => ({
        actionBar: [
          '[aria-label="Open as student"]',
          '[data-testid="commit-new-version"]',
          '[data-testid="publish-course"]',
        ].map((selector) => Boolean(document.querySelector(`[data-slot=page-action-bar] ${selector}`))),
        toolbar: Boolean(document.querySelector('[data-slot=page-toolbar] [aria-label="Open as student"]')),
      })),
    ).toEqual({ actionBar: [true, true, true], toolbar: false })
    // Explorer on the left, Versions on the right, each a card with its title inside.
    expect(rows.sidePanels).toEqual([
      { side: 'left', title: 'Explorer' },
      { side: 'right', title: 'Versions' },
    ])
    // The course's Details card sits under Versions, with its size.
    await waitFor(harness.page, () =>
      Boolean(document.querySelector('[data-slot=page-side-panel][data-side=right] [data-testid="course-info-size"]')),
    )
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
      const explorer = page.getByRole('dialog', { name: 'Explorer' })
      await explorer.waitFor()

      // Adding something keeps it open (the new item is shown where it went);
      // picking something closes it ("show me the page").
      await explorer.getByRole('button', { name: 'Add section' }).first().click()
      await page.keyboard.type('Drawn')
      await page.keyboard.press('Enter')
      await explorer.getByText('Drawn', { exact: true }).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(500)
      expect(await explorer.isVisible()).toBe(true)
      await explorer.getByText('Drawn', { exact: true }).click()
      await explorer.waitFor({ state: 'detached', timeout: 10_000 })
      // Back to the course's own page (it has both side panels).
      await page.getByRole('button', { name: 'Show or hide explorer' }).click()
      await explorer.getByText('E2E Probe Course', { exact: true }).click()
      await explorer.waitFor({ state: 'detached', timeout: 10_000 })

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
      DATA_DIR,
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

    // Tests open in interactive mode (SLJ-132): a right answer turns
    // "Check answer" into "Continue".
    expect(await clickText(harness.page, 'Check answer')).toContain('OK')
    await harness.page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 15_000 })

    // The practice test's card (SLJ-135 follow-up): a pep talk, the run's
    // longest streak and first-try score; no "New best" on a first attempt.
    expect(await clickText(harness.page, 'Continue')).toContain('OK')
    const card = harness.page.locator('[data-testid="practice-test-result"]')
    await card.waitFor({ timeout: 15_000 })
    expect(await harness.page.locator('[data-testid="practice-test-cheer"]').innerText()).toMatch(
      /^(Flawless!|Perfect run!|Every answer right, first time!)$/,
    )
    expect(await harness.page.locator('[data-testid="practice-test-streak"]').getAttribute('aria-label')).toBe(
      'Longest streak: 1',
    )
    expect(await harness.page.locator('[data-testid="practice-test-first-try"]').innerText()).toBe(
      'Right on the first try: 1 of 1',
    )
    expect(await card.innerText()).not.toContain('New best')
    // Enter continues, also with the focus off the button.
    await card.click({ position: { x: 5, y: 5 } })
    await harness.page.keyboard.press('Enter')
    await waitForText(harness.page, 'Course complete')

    // Leave the player's BlankLayout (no locale picker/sidebar chrome) so
    // later describe blocks land back on normal app chrome.
    expect(await clickText(harness.page, 'Close course')).toContain('OK')
    await waitForText(harness.page, 'English')
  })

  // SLJ-132: interactive mode reaches paper mode by its Print and Paper mode
  // buttons, X leaves the test, and Settings → Interface opens tests in paper
  // mode instead.
  it('opens a test in interactive mode, switches to paper mode, and follows the setting', async () => {
    const { page } = harness
    const openTest = () =>
      page.evaluate(
        ({ id, lessonId }) => {
          location.hash = `#/courses/${id}/lessons/${lessonId}/test`
        },
        { id: attendCourseId, lessonId },
      )
    const button = (name) => page.getByRole('button', { exact: true, name })

    await openTest()
    await button('Paper mode').waitFor({ timeout: 15_000 })

    // Print: paper mode, with the print options open.
    await button('Print test').click()
    await page.getByRole('menu').waitFor({ timeout: 15_000 })
    expect(await page.getByRole('menu').innerText()).toContain('Print options')
    await page.keyboard.press('Escape')
    await button('Interactive mode').waitFor()

    // Back to interactive, then Paper mode: the whole test on one page.
    await button('Interactive mode').click()
    await button('Paper mode').click()
    await waitForText(page, 'Prefer paper? Print this test first.')

    // X leaves the test from interactive mode too.
    await button('Interactive mode').click()
    await button('Close course').click()
    await page.waitForFunction(() => !location.hash.endsWith('/test'), undefined, { timeout: 15_000 })

    // Setting off: tests open in paper mode.
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    const setting = page.getByRole('checkbox', { name: /Start tests in interactive mode/ })
    await setting.waitFor({ timeout: 15_000 })
    expect(await setting.getAttribute('aria-checked')).toBe('true')
    await setting.click()
    await page.waitForFunction(async () => (await window.preferences.get()).startTestsInteractive === false)
    await openTest()
    await waitForText(page, 'Prefer paper? Print this test first.')
    expect(await button('Paper mode').count()).toBe(0)

    // Back on, for the cases after this one.
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await setting.click()
    await page.waitForFunction(async () => (await window.preferences.get()).startTestsInteractive === true)
    await page.evaluate(() => {
      location.hash = '#/'
    })
  })

  // SLJ-133: full screen in the player keeps its action bar, carries on from
  // a lesson to its test, and ends when the reader leaves the player.
  it('takes a lesson and its test full screen, and leaves it on Close course', async () => {
    const { app, page } = harness
    const isWindowFullScreen = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())
    const button = (name) => page.getByRole('button', { exact: true, name })

    await page.evaluate(
      ({ id, lessonId }) => {
        location.hash = `#/courses/${id}/lessons/${lessonId}`
      },
      { id: attendCourseId, lessonId },
    )
    await page.locator('[data-testid="player-full-screen"]').click()
    await expect
      .poll(isWindowFullScreen, {
        message: "the window didn't go full screen: was the display off?",
        timeout: 10_000,
      })
      .toBe(true)
    // The action bar stays (Close course), and so does the course index
    // (SLJ-158): the student still moves through the course with it.
    await button('Exit full screen').waitFor()
    expect(await button('Close course').count()).toBe(1)
    expect(await page.locator('[data-testid="course-index"]').count()).toBe(1)

    await button('Continue').click()
    await button('Paper mode').waitFor({ timeout: 15_000 })
    expect(await isWindowFullScreen()).toBe(true)
    await button('Exit full screen').waitFor()

    await button('Close course').click()
    await expect.poll(isWindowFullScreen, { timeout: 10_000 }).toBe(false)
    await page.locator('[data-testid="app-menu"]').waitFor({ timeout: 15_000 })
  })

  // SLJ-134: the course's spree, kept in the progress file. The first case
  // above answered this course's one question right first time: a spree of 1.
  it("keeps the course's spree across tests: right first tries grow it, a wrong one ends it", async () => {
    const { page } = harness
    const openTest = () =>
      page.evaluate(
        ({ id, lessonId }) => {
          location.hash = `#/courses/${id}/lessons/${lessonId}/test`
        },
        { id: attendCourseId, lessonId },
      )
    const bolt = page.locator('[data-testid="course-spree"]')
    const answer = page.getByPlaceholder('Type the result')
    const checkAnswer = () => page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    const savedSpree = () => page.evaluate(async (id) => (await window.progress.get()).courses[id]?.spree, attendCourseId)

    await openTest()
    await bolt.waitFor({ timeout: 15_000 })
    expect(await bolt.getAttribute('data-level')).toBe('1')
    expect(await bolt.innerText()).toBe('1')

    // Nothing typed isn't a try: the spree stays.
    await checkAnswer()
    await waitForText(page, 'Enter a valid answer before continuing.')
    expect(await bolt.getAttribute('data-level')).toBe('1')

    // Wrong first: the spree ends quietly (grey, no number); right on the
    // second try doesn't start a new one.
    await answer.fill('8')
    await checkAnswer()
    await expect.poll(() => bolt.getAttribute('data-level')).toBe('0')
    expect(await bolt.innerText()).toBe('')
    await answer.fill('7')
    await checkAnswer()
    await page.getByRole('button', { exact: true, name: 'Continue' }).waitFor()
    expect(await bolt.getAttribute('data-level')).toBe('0')
    await expect.poll(savedSpree).toEqual({ best: 1, current: 0 })

    // The next test (here, the same one again): right first time grows it.
    // Home first, shown for real: two address changes in a row can reach
    // React together, and the test page would stay mounted, still answered.
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await page.locator('[data-testid="course-search"]').waitFor()
    await openTest()
    await answer.fill('7')
    await checkAnswer()
    await expect.poll(() => bolt.getAttribute('data-level')).toBe('1')
    await expect.poll(savedSpree).toEqual({ best: 1, current: 1 })
    await page.evaluate(() => {
      location.hash = '#/'
    })
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
    const draftDir = path.join(DATA_DIR, 'courses', ids.courseId, 'draft')
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
// The action bar's Commit new version is disabled until then, and says why; a
// draft may be empty.
describe('commit needs sections with content', () => {
  it('disables Commit with the reason until every section has a lesson', async () => {
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
    const commitButton = page.locator('[data-testid="commit-new-version"]')
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
    expect(await commitButton.getAttribute('aria-label')).toBe('Commit new version')
  })
})

// SLJ-45: a section's summary (one line, for lists) and intro (a page students
// see first when they start the section).
// SLJ-135: a graded test gives no feedback while it's taken, asks before
// finishing with questions left empty, and ends with the score (points of the
// questions solved, out of all of them) in its grade band's colour.
describe('graded test', () => {
  it('a teacher makes a test graded, and a student finishes it with a score that stays on the course page', async () => {
    const { page } = harness
    const exercise = (prompt, formula, extra = {}) => ({
      kind: 'numeric',
      locales: { en: { prompt } },
      solution: { formula, precision: 0 },
      tags: [],
      variables: {},
      ...extra,
    })
    const ids = await page.evaluate(
      async (exercises) => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: 'E2E Graded Course' } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Exams' })
        const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Final exam' })
        await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises, template: '' }, testId })
        return { courseId, sectionId, testId }
      },
      [exercise('What is 1 plus 1?', '2', { points: 30 }), exercise('What is 2 plus 2?', '4')],
    )
    const testFile = path.join(DATA_DIR, 'courses', ids.courseId, 'draft', ids.sectionId, `${ids.testId}.json`)
    const readTest = () => JSON.parse(fs.readFileSync(testFile, 'utf8'))
    const button = (name) => page.getByRole('button', { exact: true, name })

    // The editor: Graded test instead of Practice test. The points stay.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.getByText('Final exam', { exact: true }).first().click()
    await page.locator('[data-testid="test-type-graded"]').click()
    await expect.poll(() => readTest().graded, { timeout: 15_000 }).toBe(true)
    // The description is per language: the one students see.
    await page.locator('#draft-test-description-en').fill('Answer every question.')
    await expect.poll(() => readTest().locales?.en?.description, { timeout: 15_000 }).toBe('Answer every question.')
    expect(readTest().exercises.map((saved) => saved.points)).toEqual([30, undefined])

    // Under "Show more options": bands of its own, starting from the
    // course's; unticked again, the course's apply (none in the file).
    await page.locator('[data-testid="test-more-options"]').click()
    await page.locator('[data-testid="test-own-grade-bands"]').click()
    await page.locator('[data-testid="test-grade-bands"]').waitFor()
    await expect.poll(() => readTest().gradeBands?.map((band) => band.min), { timeout: 15_000 }).toEqual([95, 85, 55])
    await page.locator('[data-testid="test-own-grade-bands"]').click()
    await page.locator('[data-testid="grade-bands-summary"]').waitFor()
    await expect.poll(() => readTest().gradeBands, { timeout: 15_000 }).toBeUndefined()

    // Taking it: no checking along the way, Next moves on.
    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    // A section test opens on its start screen (SLJ-137): title and facts.
    const start = page.locator('[data-testid="test-start-screen"]')
    await start.waitFor({ timeout: 15_000 })
    expect(await start.innerText()).toContain('Final exam')
    expect(await start.innerText()).toContain('Answer every question.')
    expect(await page.locator('[data-testid="test-start-facts"]').innerText()).toBe(
      'Graded · Questions: 2 · Points: 40',
    )
    // Enter starts it, also with the focus off the button (a click on the page).
    await start.click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Enter')
    await start.waitFor({ state: 'detached' })
    const answer = page.getByPlaceholder('Type the result')
    await answer.waitFor({ timeout: 15_000 })
    expect(await button('Check answer').count()).toBe(0)
    expect(await page.locator('[data-testid="course-spree"]').count()).toBe(0)
    // Skipped without an answer, the first step stays grey with its number,
    // not checked; it can still be reopened.
    await button('Next').click()
    await waitForText(page, 'What is 2 plus 2?')
    const skipped = page.getByRole('button', { exact: true, name: 'Review exercise 1, no answer yet' })
    expect(await skipped.getAttribute('data-skipped')).toBe('')
    expect(await skipped.innerText()).toBe('1')
    await skipped.click()
    await waitForText(page, 'What is 1 plus 1?')
    await answer.fill('2')
    await button('Next').click()
    await waitForText(page, 'What is 2 plus 2?')
    expect(await page.locator('[data-skipped]').count()).toBe(0)

    // Back to the first question with the stepper, and forward again.
    await page.getByRole('button', { name: 'Review exercise 1' }).click()
    await waitForText(page, 'What is 1 plus 1?')
    expect(await answer.inputValue()).toBe('2')
    await page.getByRole('button', { name: 'Review exercise 2' }).click()
    await waitForText(page, 'What is 2 plus 2?')

    // Enter on the last question asks before finishing (SLJ-140), also
    // saying the answers can still be changed; a second Enter finishes. The
    // empty second answer counts as wrong.
    await answer.press('Enter')
    const dialog = page.locator('[data-testid="finish-graded-test-dialog"]')
    await dialog.waitFor()
    expect(await dialog.innerText()).toContain('Questions without an answer: 1.')
    expect(await dialog.innerText()).toContain('You can still go back and change your answers.')
    await page.keyboard.press('Enter')

    // 30 of 40 points: 75%, yellow in the default bands (55%+).
    await page.locator('[data-testid="graded-test-result"]').waitFor()
    expect(await page.locator('[data-testid="graded-test-points"]').innerText()).toBe('30/40 points')
    const percent = page.locator('[data-testid="graded-test-percent"]')
    expect(await percent.innerText()).toBe('75%')
    expect(await percent.getAttribute('data-tone')).toBe('yellow')
    await expect
      .poll(() => page.evaluate((id) => window.progress.get().then((state) => state.courses[id]?.steps), ids.courseId))
      .toMatchObject({ [ids.testId]: { test: { best: { maxPoints: 40, points: 30 } } } })

    // The summary (SLJ-140): each question's points, the answer given and,
    // where wrong, the correct one.
    await page.locator('[data-testid="show-summary"]').click()
    const questions = page.locator('[data-testid="summary-question"]')
    await questions.first().waitFor()
    expect(await questions.nth(0).getAttribute('data-status')).toBe('right')
    expect(await questions.nth(0).locator('[data-testid="summary-points"]').innerText()).toBe('30/30 points')
    expect(await questions.nth(0).locator('[data-testid="summary-solution"]').count()).toBe(0)
    expect(await questions.nth(1).getAttribute('data-status')).toBe('wrong')
    expect(await questions.nth(1).locator('[data-testid="summary-answer"]').innerText()).toBe('No answer')
    expect(await questions.nth(1).locator('[data-testid="summary-solution"]').innerText()).toBe('4')
    await button('Back to the result').click()

    // Try again starts over, from the first question.
    await button('Try again').click()
    await waitForText(page, 'What is 1 plus 1?')
    expect(await answer.inputValue()).toBe('')

    // On paper, "Print grade points" (off by default) puts each question's
    // points beside it.
    await button('Paper mode').click()
    await waitForText(page, 'What is 2 plus 2?')
    expect(await bodyText(page)).not.toContain('Points:')
    await page.getByRole('button', { exact: true, name: 'Print course' }).first().click()
    await page.locator('[data-testid="print-grade-points"]').click()
    await page.keyboard.press('Escape')
    await page.emulateMedia({ media: 'print' })
    const printed = await bodyText(page)
    await page.emulateMedia({ media: 'screen' })
    expect(printed).toContain('(Points: 30)')
    expect(printed).toContain('(Points: 10)')
    expect(printed).not.toContain('Name:')

    // Name and date lines for the student to fill in (SLJ-143), off by
    // default, and the print size (SLJ-142): comfortable (full size) by
    // default, standard and compact smaller. All printed only.
    const printedRootFontSize = async () => {
      await page.emulateMedia({ media: 'print' })
      const size = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
      await page.emulateMedia({ media: 'screen' })
      return size
    }
    expect(await printedRootFontSize()).toBe('16px')
    await page.getByRole('button', { exact: true, name: 'Print course' }).first().click()
    await page.locator('[data-testid="print-name-field-option"]').click()
    await page.locator('[data-testid="print-date-field-option"]').click()
    await page.locator('[data-testid="print-density-standard"]').click()
    await page.keyboard.press('Escape')
    expect(await bodyText(page)).not.toContain('Name:')
    expect(await printedRootFontSize()).toBe('12.8px')
    await page.emulateMedia({ media: 'print' })
    const printedWithFields = await bodyText(page)
    await page.emulateMedia({ media: 'screen' })
    expect(printedWithFields).toContain('Name:')
    expect(printedWithFields).toContain('Date:')
    await page.getByRole('button', { exact: true, name: 'Print course' }).first().click()
    await page.locator('[data-testid="print-density-compact"]').click()
    await page.keyboard.press('Escape')
    expect(await printedRootFontSize()).toBe('10px')

    // The course page shows the best score, in its band's colour.
    await button('Close course').click()
    const score = page.locator('[data-testid="step-progress-score"]')
    await score.waitFor({ timeout: 15_000 })
    expect(await score.innerText()).toBe('30/40')
    expect(await score.getAttribute('data-tone')).toBe('yellow')
    // The print size ends with the test (once the test player has unmounted,
    // which can be a moment after the course page shows).
    await expect
      .poll(() => page.evaluate(() => document.documentElement.hasAttribute('data-print-density')))
      .toBe(false)
  })
})

// SLJ-135: with partial credit, an exercise with several parts earns its
// points' share for the parts right: one of two blanks, 5 of 10 points.
describe('partial credit', () => {
  it('gives a graded test half the points for half the blanks', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Partial Credit Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Days' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Days quiz' })
      const exercise = {
        kind: 'missing-word',
        locales: {
          en: {
            prompt: 'Write the missing days',
            text: '{{first}}, {{second}}, Wednesday',
            variables: [
              { answers: ['Monday'], matchCase: false, name: 'first' },
              { answers: ['Tuesday'], matchCase: false, name: 'second' },
            ],
          },
        },
        tags: [],
      }
      await window.courses.saveSectionTest({
        courseId,
        sectionId,
        test: { exercises: [exercise], graded: true, partialCredit: true, template: '' },
        testId,
      })
      return { courseId, testId }
    })

    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const blanks = page.locator('form input')
    await blanks.first().waitFor({ timeout: 15_000 })
    await blanks.nth(0).fill('Monday')
    await blanks.nth(1).fill('Friday')
    await page.getByRole('button', { exact: true, name: 'Finish test' }).click()

    await page.locator('[data-testid="graded-test-result"]').waitFor()
    expect(await page.locator('[data-testid="graded-test-points"]').innerText()).toBe('5/10 points')
    expect(await page.locator('[data-testid="graded-test-percent"]').innerText()).toBe('50%')
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// On paper, a missing-words exercise prints its sentence with a line to
// write on for each blank (it used to print only its prompt).
describe('missing words on paper', () => {
  it('prints the sentence with a line for each blank', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Missing Words Print' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Days' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Days on paper' })
      const exercise = {
        kind: 'missing-word',
        locales: {
          en: {
            prompt: 'Write the missing day',
            text: 'After {{day}} comes Wednesday.',
            variables: [{ answers: ['Tuesday'], matchCase: false, name: 'day' }],
          },
        },
        tags: [],
      }
      await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises: [exercise], template: '' }, testId })
      return { courseId, testId }
    })

    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.getByRole('button', { exact: true, name: 'Paper mode' }).first().click({ timeout: 15_000 })
    await page.emulateMedia({ media: 'print' })
    const blanks = await page.locator('[data-slot="fill-in-blank"]:visible').count()
    const printed = await bodyText(page)
    await page.emulateMedia({ media: 'screen' })
    expect(printed).toContain('Write the missing day')
    expect(printed).toContain('comes Wednesday.')
    expect(blanks).toBe(1)
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-141: in a practice test, a wrong answer can be tried again or its
// correct answer shown, which lets the student move on; the teacher can turn
// that off.
describe('show the correct answer', () => {
  it('shows it after a wrong answer, moves on, and is gone when the teacher turns it off', async () => {
    const { page } = harness
    const exercise = (prompt, formula) => ({
      kind: 'numeric',
      locales: { en: { prompt } },
      solution: { formula, precision: 0 },
      tags: [],
      variables: {},
    })
    const exercises = [exercise('What is 5 plus 2?', '7'), exercise('What is 1 plus 1?', '2')]
    const ids = await page.evaluate(async (exercises) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Show Answer' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Sums' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Sums quiz' })
      await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises, template: '' }, testId })
      return { courseId, sectionId, testId }
    }, exercises)
    const openTest = async () => {
      await page.evaluate(() => {
        location.hash = '#/'
      })
      await page.locator('[data-testid="course-search"]').waitFor()
      await page.evaluate(({ courseId, testId }) => {
        location.hash = `#/courses/${courseId}/lessons/${testId}/test`
      }, ids)
      await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    }
    const answer = page.getByPlaceholder('Type the result')
    const showAnswer = page.locator('[data-testid="show-correct-answer"]')
    const check = () => page.getByRole('button', { exact: true, name: 'Check answer' }).click()

    await openTest()
    await answer.waitFor({ timeout: 15_000 })
    // Not before a first try.
    expect(await showAnswer.count()).toBe(0)
    await answer.fill('8')
    await check()
    await showAnswer.waitFor()
    // Trying again is still possible.
    await answer.fill('9')
    await check()
    await showAnswer.click()
    expect(await page.locator('[data-testid="exercise-solution-value"]').innerText()).toBe('7')
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()
    await waitForText(page, 'What is 1 plus 1?')

    // The teacher turns it off: a wrong answer only says so. (Saved behind
    // the app's back here, so a reload drops its cached course.)
    await page.evaluate(
      ({ courseId, sectionId, testId, exercises }) =>
        window.courses.saveSectionTest({ courseId, sectionId, test: { allowShowAnswer: false, exercises, template: '' }, testId }),
      { ...ids, exercises },
    )
    await page.reload()
    await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
    await openTest()
    await answer.waitFor({ timeout: 15_000 })
    await answer.fill('8')
    await check()
    await waitForText(page, 'That answer is not correct.')
    expect(await showAnswer.count()).toBe(0)
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-145: a punctuation exercise shows the sentence without its marks; the
// student places them in the gaps (typing a mark, or from a gap's palette).
describe('punctuation', () => {
  it('places marks by typing and from the palette, grades each gap, and shows the sentence', async () => {
    const { page } = harness
    const exercise = (prompt, text) => ({ kind: 'punctuation', locales: { en: { prompt, text } }, tags: [] })
    const ids = await page.evaluate(async (exercises) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Punctuation' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Marks' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Marks quiz' })
      await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises, template: '' }, testId })
      return { courseId, testId }
    }, [exercise('Put in the marks', 'Ana said: „Fine.“'), exercise('Put in the marks', 'Mark is here.')])

    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const gaps = page.locator('[data-testid="punctuation-gap"]')
    await gaps.first().waitFor({ timeout: 15_000 })
    // A gap before, between and after the words; the marks are taken out.
    expect(await gaps.count()).toBe(4)
    expect(await page.locator('[data-testid="punctuation-sentence"]').innerText()).not.toContain(':')

    // Typing a mark into a focused gap, and picking one from its palette.
    await gaps.nth(2).focus()
    await page.keyboard.type(':')
    await gaps.nth(2).click()
    await page.getByRole('menuitem', { name: 'Add „' }).click()
    await gaps.nth(3).focus()
    await page.keyboard.type('.')
    await gaps.nth(3).click()
    await page.getByRole('menuitem', { name: 'Add “' }).click()
    expect(await gaps.nth(2).innerText()).toBe(':„')
    await page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()

    // A mark in the wrong gap: that gap turns red, and the correct sentence
    // can be shown.
    await waitForText(page, 'Mark')
    await gaps.nth(1).focus()
    await page.keyboard.type(',')
    await page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    await expect.poll(() => gaps.nth(1).getAttribute('data-tone')).toBe('wrong')
    await page.locator('[data-testid="show-correct-answer"]').click()
    expect(await page.locator('[data-testid="exercise-solution-value"]').innerText()).toBe('Mark is here.')
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-146: a rewrite exercise takes a written answer; it's right when it
// matches any of the teacher's solutions, whatever the spacing or the kind of
// quotes.
describe('rewrite', () => {
  it('accepts an answer that matches any solution, and shows the nearest one after a wrong answer', async () => {
    const { page } = harness
    const exercise = (prompt, source, solutions) => ({
      kind: 'rewrite',
      locales: { en: { prompt, solutions, source } },
      tags: [],
    })
    const ids = await page.evaluate(async (exercises) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Rewrite' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Speech' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Speech quiz' })
      await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises, template: '' }, testId })
      return { courseId, testId }
    }, [
      exercise('Write it in direct speech', 'Nena said she would buy bread.', ['Nena said: „I will buy bread.“', '„I will buy bread“, said Nena.']),
      exercise('Write it in direct speech', 'Mark asked if he could come.', ['Mark asked: „Can I come?“', '„Can I come?“ asked Mark.']),
    ])

    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const answer = page.locator('[data-testid="rewrite-answer"]')
    await answer.waitFor({ timeout: 15_000 })
    expect(await page.locator('[data-testid="rewrite-source"]').innerText()).toBe('Nena said she would buy bread.')

    // The second solution, with plain quotes and odd spacing: right.
    await answer.fill('"I will buy bread" ,  said Nena.')
    await page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()

    // Wrong: the solution nearest to the answer is the one shown.
    await waitForText(page, 'Mark asked if he could come.')
    await answer.fill('Can I come asked Mark')
    await page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    await page.locator('[data-testid="show-correct-answer"]').click()
    expect(await page.locator('[data-testid="rewrite-review-solution"]').innerText()).toBe('„Can I come?“ asked Mark.')
    // Word by word: the answer has nothing wrong, only things missing.
    const marked = (testId) =>
      page.locator(`[data-testid="${testId}"] [data-slot="marked-text-piece"]`).allInnerTexts()
    expect(await marked('rewrite-review-answer')).toEqual([])
    expect(await marked('rewrite-review-solution')).toEqual(['„', '?', '“', '.'])
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-147: sound effects in practice tests. Off for a teacher until turned on
// in Settings; then a right answer, a wrong one and the end each play theirs
// (heard through the event each sound fires, no real audio).
describe('sound effects', () => {
  it('plays nothing until turned on, then right, wrong and the end of a test', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const exercise = (source, solution) => ({
        kind: 'rewrite',
        locales: { en: { prompt: 'Write it in direct speech', solutions: [solution], source } },
        tags: [],
      })
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Sounds' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Speech' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Sound quiz' })
      await window.courses.saveSectionTest({
        courseId,
        sectionId,
        test: {
          exercises: [
            exercise('Nena said she would buy bread.', 'Nena said: „I will buy bread.“'),
            exercise('Mark asked if he could come.', 'Mark asked: „Can I come?“'),
          ],
          template: '',
        },
        testId,
      })
      window.__sounds = []
      window.addEventListener('matko:sound-effect', (event) => window.__sounds.push(event.detail.effect))
      return { courseId, testId }
    })
    const sounds = () => page.evaluate(() => window.__sounds)
    const openTest = async () => {
      await page.evaluate(({ courseId, testId }) => {
        location.hash = `#/courses/${courseId}/lessons/${testId}/test`
      }, ids)
      await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
      await page.locator('[data-testid="rewrite-answer"]').waitFor({ timeout: 15_000 })
    }
    const check = async (answer) => {
      await page.locator('[data-testid="rewrite-answer"]').fill(answer)
      await page.getByRole('button', { exact: true, name: 'Check answer' }).click()
    }

    // A teacher's default: silent. (A wrong answer, so the course's spree
    // has no best yet and the end below isn't a new best's celebration.)
    await openTest()
    await check('Nena will buy bread')
    expect(await sounds()).toEqual([])
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()

    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    const toggle = page.locator('[data-testid="settings-sound-effects"]')
    await toggle.click({ timeout: 15_000 })
    await page.waitForFunction(async () => (await window.preferences.get()).soundEffects === true)

    await openTest()
    await check('Nena said: "I will buy bread."')
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()
    await check('Mark asked if he could come')
    await page.locator('[data-testid="show-correct-answer"]').click()
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()
    await page.locator('[data-testid="practice-test-result"]').waitFor({ timeout: 15_000 })
    expect(await sounds()).toEqual(['right', 'wrong', 'done'])
    await page.locator('[data-testid="test-result-continue"]').click()

    // Back to the teacher's default, so later tests stay silent.
    await page.evaluate(() => window.preferences.set({ soundEffects: false }))
  })

  // SLJ-159: a quick double click on "Check answer" is one press. The second
  // click used to land on the Continue the first one made, skip to the next
  // question and "check" it empty.
  it('takes a double click on Check answer as one press', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Double Click' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Speech' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Double click quiz' })
      const exercise = (source, solution) => ({
        kind: 'rewrite',
        locales: { en: { prompt: 'Write it in direct speech', solutions: [solution], source } },
        tags: [],
      })
      await window.courses.saveSectionTest({
        courseId,
        sectionId,
        test: {
          exercises: [
            exercise('Nena said she would buy bread.', 'Nena said: „I will buy bread.“'),
            exercise('Mark asked if he could come.', 'Mark asked: „Can I come?“'),
          ],
          template: '',
        },
        testId,
      })
      return { courseId, testId }
    })
    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const answer = page.locator('[data-testid="rewrite-answer"]')
    await answer.waitFor({ timeout: 15_000 })
    await answer.fill('Nena said: "I will buy bread."')

    await page.getByRole('button', { exact: true, name: 'Check answer' }).dblclick()

    // Still the first question, checked right: its answer in the box, Continue next.
    await page.getByRole('button', { exact: true, name: 'Continue' }).waitFor()
    await page.waitForTimeout(500)
    expect(await answer.inputValue()).toBe('Nena said: "I will buy bread."')
    expect(await page.getByRole('button', { exact: true, name: 'Continue' }).count()).toBe(1)

    // A deliberate second press, a moment later, still moves on.
    await page.getByRole('button', { exact: true, name: 'Continue' }).click()
    await expect.poll(() => answer.inputValue()).toBe('')
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// After a wrong answer, a practice test waits for a new answer (or the
// correct one shown): Enter doesn't move on, just as the disabled button
// doesn't. It used to skip to the next question.
describe('Enter after a wrong answer', () => {
  it('stays on the question until it is answered right', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Enter Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Sums' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Enter quiz' })
      const sum = (prompt, formula) => ({
        kind: 'numeric',
        locales: { en: { prompt } },
        solution: { formula, precision: 0 },
        tags: [],
        variables: {},
      })
      await window.courses.saveSectionTest({
        courseId,
        sectionId,
        test: { exercises: [sum('Two plus two', '4'), sum('Three plus three', '6')], template: '' },
        testId,
      })
      return { courseId, testId }
    })
    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const answer = page.locator('input:visible').first()
    await answer.waitFor({ timeout: 15_000 })

    // Wrong, then Enter again: still the first question, its answer kept.
    await answer.fill('5')
    await answer.press('Enter')
    await waitForText(page, 'Two plus two')
    await page.waitForTimeout(300)
    await answer.press('Enter')
    await page.waitForTimeout(500)
    expect(await bodyText(page)).toContain('Two plus two')
    expect(await answer.inputValue()).toBe('5')

    // Right: Enter checks, the next Enter moves on.
    await answer.fill('4')
    await answer.press('Enter')
    await page.getByRole('button', { exact: true, name: 'Continue' }).waitFor()
    await page.keyboard.press('Enter')
    await waitForText(page, 'Three plus three')
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-60: `matko://` links in a lesson open course content in the app: a
// lesson of the same course, one of another course, or a page saying a
// course isn't on this device. ⌘-click opens a new tab; Copy link copies one.
describe('links to course content', () => {
  it('opens same-course, other-course and missing-course links, and copies a link', async () => {
    const { app, page } = harness
    const tabs = page.locator('[data-testid="app-tab"]')
    const hash = () => page.evaluate(() => location.hash)
    const clipboard = () => app.evaluate(({ clipboard }) => clipboard.readText())
    const missingCourseId = 'aaaaaaaaaaaaaaaa'

    const ids = await page.evaluate(async (missingCourseId) => {
      const course = async (title, lessonTitles) => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Chapter' })
        const lessonIds = []
        for (const lessonTitle of lessonTitles) {
          lessonIds.push((await window.courses.createLesson({ courseId, sectionId, title: lessonTitle })).lessonId)
        }
        return { courseId, lessonIds, sectionId }
      }
      const other = await course('E2E Links Other', ['Other lesson'])
      const main = await course('E2E Links', ['Linking lesson', 'Linked lesson'])
      const { programId } = await window.programs.create({ locale: 'en', title: 'E2E Links Program' })
      const paragraphs = [
        `[Next lesson](matko://lesson/${main.lessonIds[1]})`,
        `[Other course](matko://course/${other.courseId}/lesson/${other.lessonIds[0]})`,
        `[Missing course](matko://course/${missingCourseId})`,
        `[A program](matko://program/${programId})`,
      ]
      await window.courses.updateLessonContent({
        courseId: main.courseId,
        lessonId: main.lessonIds[0],
        locales: { en: { body: `[matko-block]: <> (markdown)\n${paragraphs.join('\n\n')}` } },
        sectionId: main.sectionId,
      })
      return { main, other, programId }
    }, missingCourseId)
    const lessonPath = (courseId, lessonId) => `#/courses/${courseId}/lessons/${lessonId}`
    const openLinkingLesson = async () => {
      await page.evaluate((target) => {
        location.hash = target
      }, lessonPath(ids.main.courseId, ids.main.lessonIds[0]))
      await page.getByRole('link', { name: 'Next lesson' }).waitFor({ timeout: 15_000 })
    }

    // The same course's lesson, in this tab.
    await openLinkingLesson()
    await page.getByRole('link', { name: 'Next lesson' }).click()
    await expect.poll(hash).toBe(lessonPath(ids.main.courseId, ids.main.lessonIds[1]))

    // Copy link in the player: the lesson open now.
    await page.locator('[data-testid="player-copy-link"]').click()
    await expect.poll(clipboard).toBe(`matko://course/${ids.main.courseId}/lesson/${ids.main.lessonIds[1]}`)

    // Another course's lesson.
    await openLinkingLesson()
    await page.getByRole('link', { name: 'Other course' }).click()
    await expect.poll(hash).toBe(lessonPath(ids.other.courseId, ids.other.lessonIds[0]))

    // A course that isn't here: its page says so.
    await openLinkingLesson()
    await page.getByRole('link', { name: 'Missing course' }).click()
    await expect.poll(hash).toBe(`#/courses/${missingCourseId}`)
    await page.locator('[data-testid="course-missing"]').waitFor({ timeout: 15_000 })

    // A program's page.
    await openLinkingLesson()
    await page.getByRole('link', { name: 'A program' }).click()
    await expect.poll(hash).toBe(`#/programs/${ids.programId}`)

    // ⌘-click (Ctrl elsewhere): a new tab, this one staying on the lesson.
    await openLinkingLesson()
    const tabCount = await tabs.count()
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.getByRole('link', { name: 'Next lesson' }).click({ modifiers: [modifier] })
    await expect.poll(() => tabs.count()).toBe(tabCount + 1)
    await tabs.nth(-1).getByRole('button', { name: 'Close tab' }).click()
    await expect.poll(() => tabs.count()).toBe(tabCount)

    // Copy link on a course in My courses: the first one listed (the list
    // can still be the one cached before this test made its courses).
    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    const firstCourse = page.locator('a[href^="#/drafts/"]').first()
    await firstCourse.waitFor({ timeout: 15_000 })
    const listedCourseId = (await firstCourse.getAttribute('href')).split('/').at(-1)
    await firstCourse.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Copy link' }).click()
    await expect.poll(clipboard).toBe(`matko://course/${listedCourseId}`)

    // Copy link in the editor's explorer.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.main.courseId)
    await page.getByText('Linked lesson', { exact: true }).first().click({ button: 'right', timeout: 15_000 })
    await page.getByRole('menuitem', { name: 'Copy link' }).click()
    await expect.poll(clipboard).toBe(`matko://course/${ids.main.courseId}/lesson/${ids.main.lessonIds[1]}`)
  })

  // "Link to a lesson" in the editor: from the `/` menu it writes a lesson's
  // title as a link (this course's: no course in the link); from the
  // formatting toolbar it links the selected text, here to another course.
  it('links lessons from the editor with the lesson picker', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const course = async (title, lessonTitle) => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Chapter' })
        const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: lessonTitle })
        return { courseId, lessonId, sectionId }
      }
      const other = await course('E2E Picker Other', 'Faraway lesson')
      const main = await course('E2E Picker', 'Writing lesson')
      const { lessonId: targetId } = await window.courses.createLesson({
        courseId: main.courseId,
        sectionId: main.sectionId,
        title: 'Target lesson',
      })
      await window.courses.updateLessonContent({
        courseId: main.courseId,
        lessonId: main.lessonId,
        // A link BlockNote's link field once broke (`https://` in front).
        locales: { en: { body: `[matko-block]: <> (markdown)\n[Broken](https://matko://lesson/${targetId})\n\nStart here` } },
        sectionId: main.sectionId,
      })
      return { main, other, targetId }
    })
    const savedBody = () =>
      page.evaluate(
        ({ courseId, lessonId }) =>
          window.courses
            .get(courseId, 'en')
            .then((course) => course.sections.flatMap((section) => section.lessons).find((lesson) => lesson.id === lessonId)?.body ?? ''),
        ids.main,
      )
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/drafts/${courseId}?node=${encodeURIComponent(`document:${lessonId}`)}`
    }, ids.main)
    const editor = page.locator('.bn-editor')
    await editor.getByText('Start here').click({ timeout: 15_000 })
    // The broken link is mended when the lesson is read.
    await editor.locator(`a[href="matko://lesson/${ids.targetId}"]`, { hasText: 'Broken' }).waitFor()
    await page.keyboard.press('End')

    // `/` menu: the lesson's title as a link at the cursor.
    await page.keyboard.type(' /Link to a lesson')
    await page.getByRole('option', { name: /Link to a lesson/ }).first().waitFor()
    await page.keyboard.press('Enter')
    const dialog = page.locator('[data-testid="lesson-link-dialog"]')
    await dialog.waitFor()
    await page.locator('[data-testid="lesson-link-search"]').fill('Target')
    await page.locator('[data-testid="lesson-link-option"]', { hasText: 'Target lesson' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await editor.locator(`a[href="matko://lesson/${ids.targetId}"]`, { hasText: 'Target lesson' }).waitFor()

    // Toolbar: the selected word becomes a link to another course's lesson.
    await page.keyboard.press('End')
    await page.keyboard.type(' and far')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowLeft')
    await page.locator('[data-testid="lesson-link-button"]').click()
    await dialog.waitFor()
    await page.locator('[data-testid="lesson-link-course"]').click()
    await page.getByRole('option', { name: 'E2E Picker Other' }).click()
    await page.locator('[data-testid="lesson-link-search"]').click()
    await page.locator('[data-testid="lesson-link-option"]', { hasText: 'Faraway lesson' }).click()
    await dialog.waitFor({ state: 'hidden' })
    await editor
      .locator(`a[href="matko://course/${ids.other.courseId}/lesson/${ids.other.lessonId}"]`, { hasText: /^far$/ })
      .waitFor()

    // BlockNote's own link field (its link button; ⌘K opens the same) keeps a
    // typed `matko://` link as it is. Typed once the cursor is back in the
    // editor: it takes focus back when the picker has finished closing.
    await page.waitForFunction(() => document.activeElement?.classList.contains('bn-editor'))
    await page.keyboard.press('End')
    await page.keyboard.type(' typed')
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowLeft')
    await page.locator('[data-test="createLink"]').click()
    const linkField = page.locator('.bn-form-popover input').first()
    await linkField.waitFor()
    await linkField.fill(`matko://lesson/${ids.targetId}`)
    await page.keyboard.press('Enter')
    await editor.locator(`a[href="matko://lesson/${ids.targetId}"]`, { hasText: /^typed$/ }).waitFor()

    // Both saved with the lesson.
    await expect
      .poll(savedBody, { timeout: 15_000 })
      .toContain(`[Target lesson](matko://lesson/${ids.targetId})`)
    expect(await savedBody()).toContain(`[far](matko://course/${ids.other.courseId}/lesson/${ids.other.lessonId})`)
    await expect.poll(savedBody, { timeout: 15_000 }).toContain(`[typed](matko://lesson/${ids.targetId})`)
    expect(await savedBody()).toContain(`[Broken](matko://lesson/${ids.targetId})`)
    expect(await savedBody()).not.toContain('https://matko://')
  })
})

// SLJ-148: tabs move with ⌘⇧← / ⌘⇧→ (not while typing) and by dragging; the
// order is saved with the tabs.
describe('reordering tabs', () => {
  it('moves the active tab by keyboard and a tab by dragging, and saves the order', async () => {
    const { page } = harness
    const tabs = page.locator('[data-testid="app-tab"]')
    const ids = () =>
      page.evaluate(() => window.preferences.get().then((preferences) => preferences.tabs.tabs.map((tab) => tab.id)))
    const activeIndex = () =>
      page.evaluate(() => [...document.querySelectorAll('[data-testid="app-tab"]')].findIndex((tab) => tab.hasAttribute('data-active')))
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    const before = await tabs.count()
    await page.locator('[data-testid="app-tab-new"]').click()
    await expect.poll(() => tabs.count()).toBe(before + 1)
    await expect.poll(activeIndex).toBe(before)
    await expect.poll(async () => (await ids()).length).toBe(before + 1)
    const newTabId = (await ids())[before]

    // One place left: still the active tab, its id moved in the saved order.
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`)
    await expect.poll(activeIndex).toBe(before - 1)
    await expect.poll(async () => (await ids()).indexOf(newTabId)).toBe(before - 1)
    await page.locator('[aria-live="polite"]').filter({ hasText: `Tab moved to position ${before} of ${before + 1}` }).waitFor()

    // Not while typing: the search box keeps the keys.
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await page.locator('[data-testid="course-search"]').click()
    await page.keyboard.press(`${modifier}+Shift+ArrowRight`)
    expect(await activeIndex()).toBe(before - 1)
    await page.locator('[data-testid="course-search"]').blur()

    // Dragged back to the end, past the tab on its right.
    const box = await tabs.nth(before - 1).boundingBox()
    const last = await tabs.nth(before).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2, { steps: 2 })
    await page.mouse.move(last.x + last.width - 4, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await ids()).indexOf(newTabId)).toBe(before)

    // And all the way to the front, past every other tab: with one more tab
    // open after it, from third place (or later) to first.
    await page.locator('[data-testid="app-tab-new"]').click()
    await expect.poll(() => tabs.count()).toBe(before + 2)
    const end = await tabs.nth(before).boundingBox()
    const first = await tabs.nth(0).boundingBox()
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2)
    await page.mouse.down()
    await page.mouse.move(end.x + end.width / 2 - 10, end.y + end.height / 2, { steps: 2 })
    await page.mouse.move(first.x + 4, end.y + end.height / 2, { steps: 10 })
    await page.mouse.up()
    await expect.poll(async () => (await ids()).indexOf(newTabId)).toBe(0)
    await tabs.nth(-1).getByRole('button', { name: 'Close tab' }).click()
    await tabs.nth(0).getByRole('button', { name: 'Close tab' }).click()
    await expect.poll(() => tabs.count()).toBe(before)
  })
})


// SLJ-139: a numeric exercise with several solutions has a labelled box for
// each: checking with one empty asks for all, a wrong one is marked, both
// right moves on.
describe('several solutions', () => {
  it('asks for every box, marks the wrong one, and passes with both right', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Several Solutions Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Apples' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Apples test' })
      const exercise = {
        kind: 'numeric',
        locales: {
          en: {
            prompt: 'Alice has {{x}} apples, Bob has {{y}} times more and Carol has {{z}} less than Bob. How many do Bob and Carol have?',
            solutionLabels: ['Bob', 'Carol'],
          },
        },
        moreSolutions: [{ formula: 'x * y - z', precision: 0 }],
        solution: { formula: 'x * y', precision: 0 },
        tags: [],
        variables: {
          x: { max: 4, min: 4, type: 'integer' },
          y: { max: 3, min: 3, type: 'integer' },
          z: { max: 2, min: 2, type: 'integer' },
        },
      }
      await window.courses.saveSectionTest({ courseId, sectionId, test: { exercises: [exercise], template: '' }, testId })
      return { courseId, testId }
    })

    await page.evaluate(({ courseId, testId }) => {
      location.hash = `#/courses/${courseId}/lessons/${testId}/test`
    }, ids)
    await page.locator('[data-testid="test-start"]').click({ timeout: 15_000 })
    const bob = page.getByLabel('Bob', { exact: true })
    const carol = page.getByLabel('Carol', { exact: true })
    const check = () => page.getByRole('button', { exact: true, name: 'Check answer' }).click()

    // Enter in Bob's box goes to Carol's instead of checking.
    await bob.fill('12')
    await bob.press('Enter')
    expect(await carol.evaluate((element) => element === document.activeElement)).toBe(true)

    await check()
    await waitForText(page, 'Enter all the answers before checking.')

    await carol.fill('9')
    await check()
    await expect.poll(() => carol.getAttribute('aria-invalid')).toBe('true')
    expect(await bob.getAttribute('aria-invalid')).toBeNull()

    await carol.fill('10')
    await check()
    await page.getByRole('button', { exact: true, name: 'Continue' }).waitFor()
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-136: a final test with no exercises of its own includes the course's
// other tests', picking a number of them round robin: one from each test.
describe('final test', () => {
  it('picks from the other tests of the course, one from each in turn', async () => {
    const { page } = harness
    const exercise = (prompt, formula) => ({
      kind: 'numeric',
      locales: { en: { prompt } },
      solution: { formula, precision: 0 },
      tags: [],
      variables: {},
    })
    const ids = await page.evaluate(
      async ({ first, second }) => {
        const { courseId } = await window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: 'E2E Final Test Course' } },
          supportedLocales: ['en'],
        })
        const { sectionId } = await window.courses.createSection({ courseId, title: 'Everything' })
        const save = async (title, test) => {
          const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title })
          await window.courses.saveSectionTest({ courseId, sectionId, test: { template: '', ...test }, testId })
          return testId
        }
        await save('Adding', { exercises: first })
        await save('Doubling', { exercises: second })
        const finalId = await save('Final test', { exerciseCount: 2, exercises: [], includeCourseExercises: true })
        return { courseId, finalId }
      },
      {
        first: [exercise('Adding one: 1 plus 1?', '2'), exercise('Adding two: 2 plus 2?', '4')],
        second: [exercise('Doubling: twice 3?', '6')],
      },
    )

    // The editor shows the pool, and no "long test" note for 3 exercises.
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.getByText('Final test', { exact: true }).first().click()
    await page.locator('[data-testid="course-exercise-pool"]').waitFor({ timeout: 15_000 })
    expect(await page.locator('[data-testid="course-exercise-pool"]').innerText()).toBe(
      'Exercises to pick from: 3 · Tests: 2',
    )
    expect(await page.locator('[data-testid="test-exercise-count"]').inputValue()).toBe('2')
    expect(await page.locator('[data-testid="long-test-alert"]').count()).toBe(0)

    // Two questions, one from each test.
    await page.evaluate(({ courseId, finalId }) => {
      location.hash = `#/courses/${courseId}/lessons/${finalId}/test`
    }, ids)
    await page.getByRole('button', { exact: true, name: 'Paper mode' }).click()
    await waitForText(page, 'Doubling: twice 3?')
    const text = await bodyText(page)
    expect(text.match(/Adding (one|two):/g)).toHaveLength(1)
    await page.getByRole('button', { exact: true, name: 'Close course' }).click()
  })
})

// SLJ-131: the course editor's explorer is one element for all its pages. It
// used to be mounted anew with every page, which lost a click that started
// just before the page changed (and forgot collapsed sections).
describe('course editor explorer', () => {
  it('stays the same across pages, keeping a collapsed section collapsed', async () => {
    const { page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Explorer Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section A' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Lesson A1' })
      await window.courses.createSection({ courseId, title: 'Section B' })
      return courseId
    })
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    const lessonA1 = page.getByText('Lesson A1', { exact: true })
    await lessonA1.waitFor({ timeout: 15_000 })

    // Collapse Section A with its chevron, and mark the explorer element.
    await page
      .getByText('Section A', { exact: true })
      .locator('xpath=ancestor::div[contains(@class, "group/row")][1]')
      .locator('button')
      .first()
      .click()
    await lessonA1.waitFor({ state: 'detached' })
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('div')].find((el) => el.textContent === 'Section B')
      window.__explorerRow = row
    })

    // Another page: the same explorer, Section A still collapsed.
    await page.getByText('Section B', { exact: true }).first().click()
    await page.locator('[id^="draft-section-title-"]').first().waitFor()
    expect(await page.evaluate(() => window.__explorerRow.isConnected)).toBe(true)
    expect(await lessonA1.count()).toBe(0)
  })
})

describe('rename from the explorer', () => {
  it('Rename opens a section, a document or a test with its title field focused, and the new title is saved', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Rename Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Old section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Old document' })
      const { testId } = await window.courses.createSectionTest({ courseId, sectionId, title: 'Old test' })
      return { courseId, lessonId, sectionId, testId }
    })
    const sectionDir = path.join(DATA_DIR, 'courses', ids.courseId, 'draft', ids.sectionId)
    const readJson = (file) => JSON.parse(fs.readFileSync(path.join(sectionDir, file), 'utf8'))
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)

    const rename = async (oldTitle, fieldPrefix, newTitle) => {
      await page.getByText(oldTitle, { exact: true }).first().click({ button: 'right' })
      await page.locator('[data-testid="explorer-rename"]').click()
      await waitFor(page, (prefix) => document.activeElement?.id?.startsWith(prefix), { arg: fieldPrefix })
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
      await page.keyboard.type(newTitle)
    }

    await waitForText(page, 'Old section')
    await rename('Old section', 'draft-section-title-', 'New section')
    await expect.poll(() => readJson('section.json').locales.en.title, { timeout: 15_000 }).toBe('New section')

    await rename('Old document', 'draft-document-title-', 'New document')
    await expect.poll(() => readJson(`${ids.lessonId}.json`).locales.en.title, { timeout: 15_000 }).toBe('New document')
    // The explorer shows it, and the document keeps its id (and file).
    await waitForText(page, 'New document')

    await rename('Old test', 'draft-test-title-', 'New test')
    await expect.poll(() => readJson(`${ids.testId}.json`).locales.en.title, { timeout: 15_000 }).toBe('New test')
  })
})

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
    const sectionDir = path.join(DATA_DIR, 'courses', ids.courseId, 'draft', ids.sectionId)
    // By its address (SLJ-12): a click in the explorer right after the
    // address changes can lose to the editor following that address.
    const openSectionPage = async () => {
      await page.evaluate(({ courseId, sectionId }) => {
        location.hash = `#/drafts/${courseId}?node=${encodeURIComponent(`section:${sectionId}`)}`
      }, ids)
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
    // The breadcrumbs name the section; the action bar says it's the intro.
    expect(await page.locator('[data-testid="lesson-section-intro"]').innerText()).toBe('Introduction')
    expect(await clickText(page, 'Continue')).toContain('OK')
    await waitForText(page, 'Lesson one text.')
    // A lesson has no label there (no "Lesson 1 of 1": the course index shows where it is).
    await expect.poll(() => page.locator('[data-testid="lesson-section-intro"]').count()).toBe(0)

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
    const manifestPath = path.join(DATA_DIR, 'courses', ids.courseId, 'draft', 'course.json')

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

    // Teacher: the same terms are marked while writing the lesson. The editor
    // first, for real: the lesson page it replaces also shows "Newbery".
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.locator('#draft-course-title-en').waitFor()
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
    const draftDir = path.join(DATA_DIR, 'courses', ids.courseId, 'draft')
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

    // Type at the end of the lesson's last paragraph so autosave writes it
    // back to disk. Clicked in that paragraph, as a person would: the middle
    // of the editor is the unknown block, which can't be edited.
    await page.locator('.bn-editor').getByText('Text after the unknown block.').click()
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
      const first = await window.courses.cutVersion({ courseId, releaseType: 'minor' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Second' })
      const second = await window.courses.cutVersion({ courseId, releaseType: 'minor' })
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

// SLJ-12: tabs in the title bar, each with its own back/forward history,
// saved in the profile's preferences.
describe('tabs', () => {
  it('opens a tab, switches, goes back in each tab, and closes it', async () => {
    const { page } = harness
    const tabs = page.locator('[data-testid="app-tab"]')
    const titles = () => tabs.allInnerTexts()
    const activeTitle = () => page.locator('[data-testid="app-tab"][data-active]').innerText()
    // One address change at a time, each drawn before the next: two in a row
    // can reach React together, and the tab would record only the last.
    const go = (hash) =>
      page.evaluate(
        (target) =>
          new Promise((resolve) => {
            location.hash = target
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          }),
        hash,
      )
    const hashIs = (hash) => expect.poll(() => page.evaluate(() => location.hash)).toBe(hash)
    const savedTabs = () => page.evaluate(() => window.preferences.get().then((preferences) => preferences.tabs))

    await go('#/')
    await go('#/my-courses')
    await expect.poll(activeTitle).toBe('My courses')

    // + opens a tab on Home, after the active one.
    await page.locator('[data-testid="app-tab-new"]').click()
    await expect.poll(titles).toEqual(['My courses', 'Home'])
    await hashIs('#/')
    await go('#/settings')
    await expect.poll(activeTitle).toBe('Settings')

    // Back in this tab goes to its own Home, not the other tab's page.
    await page.getByRole('button', { exact: true, name: 'Back' }).click()
    await hashIs('#/')
    await expect.poll(activeTitle).toBe('Home')
    await page.getByRole('button', { exact: true, name: 'Forward' }).click()
    await hashIs('#/settings')

    // Switching shows the first tab's page; its own Back goes to Home.
    await tabs.first().getByRole('tab').click()
    await hashIs('#/my-courses')
    await page.getByRole('button', { exact: true, name: 'Back' }).click()
    await hashIs('#/')

    // Saved in the profile's preferences, with each tab's history.
    await expect
      .poll(async () => (await savedTabs())?.tabs.map((tab) => tab.entries.at(tab.index)))
      .toEqual(['/', '/settings'])

    // Closing the active tab shows the other one; a middle-click closes too.
    await tabs.first().getByRole('button', { name: 'Close tab' }).click({ force: true })
    await expect.poll(titles).toEqual(['Settings'])
    await hashIs('#/settings')
    await page.locator('[data-testid="app-tab-new"]').click()
    await expect.poll(titles).toEqual(['Settings', 'Home'])
    await tabs.nth(1).click({ button: 'middle' })
    await expect.poll(titles).toEqual(['Settings'])

    // ⌘W (Ctrl+W off macOS) closes the active tab, not the window.
    await page.locator('[data-testid="app-tab-new"]').click()
    await expect.poll(titles).toEqual(['Settings', 'Home'])
    // Through Electron's own input path: Playwright's key presses skip the
    // before-input-event that main listens on.
    await harness.app.evaluate(({ BrowserWindow }, modifier) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents
      contents.sendInputEvent({ keyCode: 'W', modifiers: [modifier], type: 'keyDown' })
      contents.sendInputEvent({ keyCode: 'W', modifiers: [modifier], type: 'keyUp' })
    }, process.platform === 'darwin' ? 'meta' : 'control')
    await expect.poll(titles).toEqual(['Settings'])
    expect(await harness.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1)

    // Closing the last tab leaves one on Home.
    await tabs.first().getByRole('button', { name: 'Close tab' }).click({ force: true })
    await expect.poll(titles).toEqual(['Home'])
    await hashIs('#/')

    // From the sidebar: right-click → Open in new tab, a middle-click, and
    // ⌘-click (Ctrl-click off macOS) each open a new tab; a plain click
    // still navigates the current one.
    const sidebarLink = (name) => page.locator('[data-slot="sidebar"] a').filter({ hasText: name }).first()
    await sidebarLink('My courses').click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Open in new tab' }).click()
    await expect.poll(titles).toEqual(['Home', 'My courses'])
    await hashIs('#/my-courses')
    await sidebarLink('Publishers').click({ button: 'middle' })
    await expect.poll(titles).toEqual(['Home', 'My courses', 'Publishers'])
    await hashIs('#/publishers')
    await sidebarLink('Home').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] })
    await expect.poll(titles).toEqual(['Home', 'My courses', 'Publishers', 'Home'])
    await sidebarLink('My courses').click()
    await expect.poll(titles).toEqual(['Home', 'My courses', 'Publishers', 'My courses'])

    // A course on Home: right-click shows Open in new tab with the same
    // actions as its ⋯ menu (the bundled course: Hide course).
    await page.evaluate(() => {
      location.hash = '#/'
    })
    const bundledLink = page.locator(`[data-testid^="home-group-"] a[href$="/courses/${BUNDLED_COURSE_ID}"]`).first()
    await bundledLink.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Hide course' }).waitFor()
    await page.getByRole('menuitem', { name: 'Open in new tab' }).click()
    await expect.poll(async () => (await titles()).at(-1)).toBe('Getting Started with Matko')
    await hashIs(`#/courses/${BUNDLED_COURSE_ID}`)

    // A breadcrumb that links somewhere: right-click → Open in new tab.
    await page.locator('[data-slot="breadcrumb"] a').filter({ hasText: 'Home' }).first().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Open in new tab' }).click()
    await expect.poll(async () => (await titles()).at(-1)).toBe('Home')
    await hashIs('#/')

    // Back to one tab on Home for the tests after this one.
    for (let i = 0; i < 5; i++) await tabs.first().getByRole('button', { name: 'Close tab' }).click({ force: true })
    await expect.poll(async () => (await titles()).length).toBe(1)
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await expect.poll(titles).toEqual(['Home'])
  })
})

// SLJ-12: the course editor keeps its explorer selection in its address, so
// an explorer node opens in a new tab on that node, and a tab comes back to it.
describe('explorer nodes in tabs', () => {
  it('opens a document in a new tab, and each tab keeps its own selection', async () => {
    const { page } = harness
    const tabs = page.locator('[data-testid="app-tab"]')
    const titles = () => tabs.allInnerTexts()
    const hash = () => page.evaluate(() => location.hash)
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Explorer Tabs' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Chapter' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Explorer doc' })
      return { courseId, lessonId, sectionId }
    })

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.getByText('Chapter', { exact: true }).first().click()
    // Selecting a node puts it in the address.
    await expect.poll(hash).toBe(`#/drafts/${ids.courseId}?node=${encodeURIComponent(`section:${ids.sectionId}`)}`)

    await page.getByText('Explorer doc', { exact: true }).first().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Open in new tab' }).click()
    await expect.poll(async () => (await titles()).at(-1)).toBe('Explorer doc')
    await expect.poll(hash).toBe(`#/drafts/${ids.courseId}?node=${encodeURIComponent(`document:${ids.lessonId}`)}`)
    await page.locator('[data-slot="breadcrumb-page"]').filter({ hasText: 'Explorer doc' }).waitFor()

    // The first tab still shows the section.
    await tabs.nth(-2).getByRole('tab').click()
    await expect.poll(hash).toBe(`#/drafts/${ids.courseId}?node=${encodeURIComponent(`section:${ids.sectionId}`)}`)
    await page.locator('[data-slot="breadcrumb-page"]').filter({ hasText: 'Chapter' }).waitFor()

    // Back to one tab on Home.
    await tabs.last().getByRole('button', { name: 'Close tab' }).click({ force: true })
    await expect.poll(async () => (await titles()).length).toBe(1)
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await expect.poll(titles).toEqual(['Home'])
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
      const first = await window.courses.cutVersion({ courseId, releaseType: 'minor' })
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
    // Commit without publishing: its own button in the action bar.
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
      const cut = await window.courses.cutVersion({ courseId, releaseType: 'minor' })
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

// Something missing in one of the course's languages shows as a red dot in
// the explorer: on the item, and on its section, which may be closed.
describe('incomplete items in the explorer', () => {
  it('marks a document without a title in one language, and its section', async () => {
    const { page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Gaps Course' } },
        supportedLocales: ['en', 'sr'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Gaps section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Untranslated' })
      await window.courses.updateLessonMetadata({ courseId, lessonId, locales: { sr: { title: '' } }, sectionId })
      return courseId
    })
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)

    // The document and its section (shown in whichever language the app is in).
    await expect.poll(() => page.locator('[data-testid="explorer-incomplete"]').count(), { timeout: 15_000 }).toBe(2)
    // Its tooltip says what's missing.
    await page.locator('[data-testid="explorer-incomplete"]').last().hover()
    await page.locator('[data-slot="tooltip-content"]').waitFor()
    expect((await page.locator('[data-slot="tooltip-content"]').innerText()).trim()).not.toBe('')

    // Commit lists it as a warning, and still lets the teacher commit.
    await page.mouse.move(0, 0)
    await page.click('[data-testid="commit-new-version"]')
    await page.locator('[data-testid="incomplete-content-warning"]').waitFor()
    await page.keyboard.press('Escape')
  })
})

// Printing a lesson with a video: Chromium prints a <video> as an empty box
// with its controls, so each video's first frame is captured once it loads,
// as its poster and as an image only print shows (use-video-print-frames.ts).
describe('videos in print', () => {
  it("prints a lesson's video as its first frame", async () => {
    const { page } = harness
    const video = [...fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'test-video.mp4'))]
    const ids = await page.evaluate(async (bytes) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Video Print Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      const asset = await window.courses.uploadAssetBytes({
        courseId,
        data: new Uint8Array(bytes).buffer,
        filename: 'clip.mp4',
        kind: 'video',
      })
      await window.courses.updateLessonContent({
        courseId,
        lessonId,
        locales: { en: { body: `[matko-block]: <> (video)\n[The clip](${asset.path})` } },
        sectionId,
      })
      return { courseId, lessonId }
    }, video)
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}`
    }, ids)

    const frame = page.locator('img.video-print-frame')
    await frame.waitFor({ state: 'attached', timeout: 15_000 })
    expect(await frame.getAttribute('src')).toMatch(/^data:image\/jpeg/)
    expect(await page.evaluate(() => document.querySelector('video').poster)).toMatch(/^data:image\/jpeg/)

    // On screen the player; in print the frame instead.
    expect(await frame.isVisible()).toBe(false)
    await page.emulateMedia({ media: 'print' })
    try {
      expect(await frame.isVisible()).toBe(true)
      expect(await page.locator('video').isVisible()).toBe(false)
    } finally {
      await page.emulateMedia({ media: 'screen' })
    }
  })
})

// SLJ-56: an exercise can have an image or a video above its prompt. The
// teacher adds them in the test editor (the file picker is stubbed); they're
// saved on the exercise in the test's JSON, kept when a version is committed,
// and shown to the student: the image with its alt text, the decorative video
// hidden from screen readers.
describe('exercise media', () => {
  it('adds an image with alt text and a decorative video, keeps them on commit, and shows them to students', async () => {
    const { app, page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Media Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Media section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Media lesson' })
      await window.courses.saveLessonTest({
        courseId,
        lessonId,
        sectionId,
        test: {
          exercises: [
            {
              kind: 'numeric',
              locales: { en: { prompt: 'Count the apples' } },
              solution: { formula: '3', precision: 0 },
              tags: [],
              variables: {},
            },
            {
              kind: 'numeric',
              locales: { en: { prompt: 'Count the beats' } },
              solution: { formula: '4', precision: 0 },
              tags: [],
              variables: {},
            },
          ],
          template: '',
        },
      })
      return { courseId, lessonId, sectionId }
    })
    const draftDir = path.join(DATA_DIR, 'courses', ids.courseId, 'draft')
    const testFile = path.join(draftDir, ids.sectionId, `${ids.lessonId.replace(/^lesson-/, 'test-')}.json`)
    const readTest = () => JSON.parse(fs.readFileSync(testFile, 'utf8'))
    // A 1×1 PNG, and the video fixture, as the files the teacher picks.
    const imagePath = path.join(USER_DATA, 'apples.png')
    fs.writeFileSync(
      imagePath,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    )
    const pickFile = (filePath) =>
      app.evaluate(({ dialog }, picked) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picked] })
      }, filePath)

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.getByText('Media lesson', { exact: true }).first().click()
    await page.getByText('Test', { exact: true }).first().click()

    // The first exercise: an image, with alt text.
    // Media is under "Show more options", there and in the "Add exercise" form.
    await page.getByText('Count the apples', { exact: true }).first().click()
    await page.locator('[data-testid="exercise-more-options"]:visible').last().click()
    await pickFile(imagePath)
    await page.locator('[data-testid="exercise-media-add-image"]').first().click()
    await page.locator('[data-testid="exercise-media-alt"]').first().fill('Three red apples')

    // The second: a decorative video.
    await page.getByText('Count the beats', { exact: true }).first().click()
    await page.locator('[data-testid="exercise-more-options"]:visible').last().click()
    await pickFile(path.join(import.meta.dirname, 'fixtures', 'test-video.mp4'))
    await page.locator('[data-testid="exercise-media-add-video"]').first().click()
    // Once the video is in, both exercises have the checkbox: the second is the video's.
    await expect.poll(() => page.locator('[data-testid="exercise-media-decorative"]').count(), { timeout: 15_000 }).toBe(2)
    await page.locator('[data-testid="exercise-media-decorative"]').last().click()

    await expect
      .poll(() => readTest().exercises.map((exercise) => [exercise.media?.kind, exercise.media?.decorative ?? false, exercise.locales.en.mediaAlt]), {
        timeout: 15_000,
      })
      .toEqual([
        ['image', false, 'Three red apples'],
        ['video', true, undefined],
      ])
    const [imageFile, videoFile] = readTest().exercises.map((exercise) => exercise.media.assetFilename)

    // Committing keeps both files in the version.
    const { version } = await page.evaluate(
      (id) => window.courses.cutVersion({ courseId: id, releaseType: 'minor' }),
      ids.courseId,
    )
    const versionAssets = path.join(DATA_DIR, 'courses', ids.courseId, 'versions', version, 'assets')
    expect(fs.existsSync(path.join(versionAssets, imageFile))).toBe(true)
    expect(fs.existsSync(path.join(versionAssets, videoFile))).toBe(true)

    // The student sees the image, named by its alt text, above its prompt.
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}/test`
    }, ids)
    const image = page.locator('[data-testid="exercise-media"] img[alt="Three red apples"]').first()
    await image.waitFor({ timeout: 15_000 })
    expect(await image.getAttribute('src')).toBe(`matko-asset://${ids.courseId}/${imageFile}`)
    expect(await page.evaluate(() => document.querySelector('[data-testid="exercise-media"] img').naturalWidth)).toBe(1)

    // The decorative video, on the next exercise: paper mode shows them all
    // (tests open in interactive mode, one at a time; SLJ-132).
    const decorative = page.locator('[data-testid="exercise-media"][data-decorative]')
    await page.click('[data-testid="test-paper-mode"]')
    await decorative.first().waitFor({ timeout: 15_000 })
    expect(await decorative.first().getAttribute('aria-hidden')).toBe('true')
    expect(await decorative.locator('video').getAttribute('controlslist')).toBe('nodownload')

    await page.evaluate(() => {
      location.hash = '#/'
    })
  })
})

// SLJ-50: a student's progress, kept per profile in course-progress.json
// (never in the course's folder). Going through a course marks its lesson
// done and keeps the test's first-try score and streak; the course page shows
// both, and a starred course shows under Favorites on Home.
describe('course progress', () => {
  it('records a lesson done and a first-try test score, and shows them on the course page and Home', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Progress Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Progress lesson' })
      await window.courses.updateSectionIntro({ courseId, locales: { en: { body: 'Welcome to the section.' } }, sectionId })
      await window.courses.saveLessonTest({
        courseId,
        lessonId,
        sectionId,
        test: {
          exercises: [
            { kind: 'numeric', locales: { en: { prompt: 'Two plus two' } }, solution: { formula: '4', precision: 0 }, tags: [], variables: {} },
            { kind: 'numeric', locales: { en: { prompt: 'Three plus three' } }, solution: { formula: '6', precision: 0 }, tags: [], variables: {} },
          ],
          template: '',
        },
      })
      return { courseId, introId: `intro-${sectionId}`, lessonId }
    })
    const progressFile = path.join(DATA_DIR, 'course-progress.json')
    const courseProgress = () => JSON.parse(fs.readFileSync(progressFile, 'utf8')).courses[ids.courseId]
    const testStepId = ids.lessonId.replace(/^lesson-/, 'test-')

    // Opening the section's intro starts the course; Continue marks it done
    // (it shows Done, but isn't one of the steps "N of M done" counts).
    await page.evaluate(({ courseId, introId }) => {
      location.hash = `#/courses/${courseId}/lessons/${introId}`
    }, ids)
    await page.click('[data-testid="lesson-continue"]')
    await expect.poll(() => courseProgress()?.steps?.[ids.introId]?.doneAt, { timeout: 15_000 }).toBeTruthy()

    // Then the lesson: Continue marks it done.
    await page.locator('[data-testid="lesson-continue"]').waitFor()
    await page.click('[data-testid="lesson-continue"]')
    await expect.poll(() => courseProgress()?.steps?.[ids.lessonId]?.doneAt, { timeout: 15_000 }).toBeTruthy()
    expect(courseProgress().startedAt).toBeTruthy()

    // The test, all at once: the first answer right, the second wrong on the
    // first try and then fixed. The score counts first tries only.
    // The test page's only inputs are its answers. Tests open in interactive
    // mode (SLJ-132); paper mode shows them all.
    await page.click('[data-testid="test-paper-mode"]')
    const answers = page.locator('input:visible')
    await answers.first().waitFor({ timeout: 15_000 })
    await answers.nth(0).fill('4')
    await answers.nth(1).fill('5')
    await page.click('[data-testid="test-primary-action"]')
    await answers.nth(1).fill('6')
    await page.click('[data-testid="test-primary-action"]')
    await page.click('[data-testid="test-primary-action"]')
    await expect
      .poll(() => courseProgress()?.steps?.[testStepId]?.test, { timeout: 15_000 })
      .toMatchObject({ attempts: 1, best: { correct: 1, longestStreak: 1, total: 2 } })

    // Nothing of it is in the course's own folder.
    const courseDir = path.join(DATA_DIR, 'courses', ids.courseId)
    const courseTexts = fs
      .readdirSync(courseDir, { recursive: true })
      .map(String)
      .filter((file) => /\.(json|md)$/.test(file))
      .map((file) => fs.readFileSync(path.join(courseDir, file), 'utf8'))
    expect(courseTexts.some((text) => text.includes('longestStreak') || text.includes('startedAt'))).toBe(false)

    // The course page: finished, the lesson and the test done, and the test's
    // best streak (one first-try right answer in a row, out of two).
    await page.evaluate((courseId) => {
      location.hash = `#/courses/${courseId}`
    }, ids.courseId)
    await page.locator('[data-testid="course-progress-label"]').waitFor({ timeout: 15_000 })
    expect(await page.locator('[data-testid="step-progress-done"]').count()).toBe(3)
    expect((await page.locator('[data-testid="step-progress-streak"]').innerText()).trim()).toBe('1/2')

    // Clear course progress (the ⋯ menu, before Remove course): the course
    // starts over, its star stays.
    await page.locator('[data-testid="course-favorite"]').first().click()
    await expect.poll(() => courseProgress()?.favorite, { timeout: 15_000 }).toBe(true)
    await page.click('[data-testid="course-actions-menu"]')
    await page.locator('[data-testid="clear-course-progress"]').waitFor()
    const menuItems = await page.getByRole('menuitem').evaluateAll((items) => items.map((item) => item.dataset.testid ?? ''))
    expect(menuItems.indexOf('clear-course-progress')).toBe(menuItems.length - 2)
    await page.click('[data-testid="clear-course-progress"]')
    await page.click('[data-testid="confirm-clear-progress"]')
    await expect.poll(() => courseProgress(), { timeout: 15_000 }).toMatchObject({ favorite: true, steps: {} })
    expect(courseProgress().startedAt).toBeUndefined()
    await expect.poll(() => page.locator('[data-testid="step-progress-done"]').count(), { timeout: 15_000 }).toBe(0)
    await page.click('[data-testid="course-actions-menu"]')
    expect(await page.locator('[data-testid="clear-course-progress"]').getAttribute('aria-disabled')).toBe('true')
    await page.keyboard.press('Escape')
    // Unstarred again: the favorites below start from none.
    await page.locator('[data-testid="course-favorite"]').first().click()
    await expect.poll(() => courseProgress()?.favorite, { timeout: 15_000 }).toBe(false)

    // Starring a course from its page saves it; it stays in its own group on
    // Home, and the :favorites search filter shows only starred courses.
    await page.evaluate(() => {
      location.hash = '#/'
    })
    const bundledId = await page.evaluate(async () => (await window.courses.list()).find((course) => course.distribution === 'bundled')?.id)
    await page.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, bundledId)
    await page.locator('[data-testid="course-favorite"]').first().click()
    await expect.poll(() => JSON.parse(fs.readFileSync(progressFile, 'utf8')).courses[bundledId]?.favorite, { timeout: 15_000 }).toBe(true)
    // The sidebar's Favorites appears, with the course in it.
    await page.locator(`[data-testid="sidebar-favorites"] a[href$="/courses/${bundledId}"]`).waitFor({ timeout: 15_000 })
    await page.evaluate(() => {
      location.hash = '#/'
    })
    // In Home's table view (the star sits above the row's link, so it toggles).
    await page.evaluate(() => window.preferences.set({ homeView: 'table' }))
    await page.reload()
    const starred = page.locator('[data-testid="course-favorite"][aria-pressed="true"]')
    await starred.first().waitFor({ timeout: 15_000 })
    expect(await page.locator('[data-testid="home-group-favorites"]').count()).toBe(0)
    const search = page.locator('[data-testid="course-search"]')
    await search.fill(':favorites')
    await expect.poll(() => page.locator('[data-testid="course-favorite"]').count(), { timeout: 15_000 }).toBe(1)
    await search.fill('')
    await starred.first().click()
    await expect.poll(() => JSON.parse(fs.readFileSync(progressFile, 'utf8')).courses[bundledId]?.favorite, { timeout: 15_000 }).toBe(false)
    // With nothing starred, the sidebar has no Favorites.
    await expect.poll(() => page.locator('[data-testid="sidebar-favorites"]').count(), { timeout: 15_000 }).toBe(0)
    expect(page.url()).toMatch(/#\/$/)

    // Removing a course removes its progress.
    await page.evaluate((courseId) => window.courses.remove(courseId), ids.courseId)
    expect(JSON.parse(fs.readFileSync(progressFile, 'utf8')).courses[ids.courseId]).toBeUndefined()
  })
})

// SLJ-32 phase 1: a teacher makes a program (an ordered set of courses with
// its own page) in My programs: title, description, logo, colors, one of their
// courses. program.json lands in the profile's programs/ folder, and Preview
// shows the program's page, the course linking to its own page.
describe('programs', () => {
  it('makes a program in My programs and previews its page', async () => {
    const { app, page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: 'Caesar to Enigma.', title: 'E2E Classical ciphers' } },
        supportedLocales: ['en'],
      })
      return courseId
    })
    const logoPath = path.join(USER_DATA, 'program-logo.png')
    fs.writeFileSync(
      logoPath,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    )
    await app.evaluate(({ dialog }, picked) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picked] })
    }, logoPath)
    // The course was made over IPC, behind the app's cached course list.
    await page.reload()
    await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)

    await page.evaluate(() => {
      location.hash = '#/my-programs'
    })
    await page.click('[data-testid="new-program"]')
    await page.fill('#new-program-title', 'E2E Cypherpunks')
    await page.click('[data-testid="create-program"]')
    // In the app's language (an earlier test may have left it in Serbian).
    await page.locator('[data-testid^="program-title-"]').waitFor({ timeout: 15_000 })
    const programId = page.url().split('/my-programs/')[1]

    await page.locator('[id^="program-description-"]').fill('From the mailing list to Bitcoin.')
    await page.click('[data-testid="program-pick-logo"]')
    await page.click('[data-testid="program-add-course"]')
    await page.getByRole('option', { name: 'E2E Classical ciphers' }).click()
    await page.locator('[data-testid="program-courses"] li').first().waitFor()

    const programFile = path.join(DATA_DIR, 'programs', programId, 'program.json')
    const readProgram = () => (fs.existsSync(programFile) ? JSON.parse(fs.readFileSync(programFile, 'utf8')) : null)
    await expect
      .poll(() => {
        const program = readProgram()
        return program && [program.locales[program.defaultLocale].description, Boolean(program.logo), program.courses.map((course) => course.courseId)]
      }, { timeout: 15_000 })
      .toEqual(['From the mailing list to Bitcoin.', true, [courseId]])
    expect(readProgram().courses[0].snapshot.locales.en.title).toBe('E2E Classical ciphers')
    expect(fs.existsSync(path.join(DATA_DIR, 'programs', programId, 'assets', readProgram().logo))).toBe(true)

    // Preview: the program's page, as students will see it.
    await page.click('[data-testid="program-preview"]')
    await page.locator('[data-testid="program-page"]').waitFor({ timeout: 15_000 })
    expect((await page.locator('[data-testid="program-title"]').innerText()).trim()).toBe('E2E Cypherpunks')
    const logo = page.locator('[data-testid="program-page"] [data-slot="cover-logo"] img')
    await expect.poll(() => logo.evaluate((image) => image.naturalWidth), { timeout: 15_000 }).toBe(1)
    // Back from the preview to the editor.
    await page.click('[data-testid="program-edit"]')
    await page.locator('[data-testid^="program-title-"]').waitFor({ timeout: 15_000 })
    // The theme's main colors are up front, not only under More colors.
    await page.click('[data-testid="program-add-theme"]')
    for (const name of ['background', 'foreground', 'primary', 'secondary', 'sidebar']) {
      await page.locator(`[data-testid="program-color-${name}"]`).waitFor()
    }
    await page.click('[data-testid="program-preview"]')
    await page.locator('[data-testid="program-page"]').waitFor({ timeout: 15_000 })
    await page.getByRole('link', { name: 'E2E Classical ciphers' }).click()
    await waitForUrl(page, `#/courses/${courseId}`)
  })

  // A program's theme recolors the whole app on its page and in its courses,
  // never elsewhere, and not at all with "Use program colors" off. The editor
  // shows a color live, before it's saved.
  it("recolors the app with a program's theme on its page and in its courses", async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Themed course' } },
        supportedLocales: ['en'],
      })
      const { programId } = await window.programs.create({ locale: 'en', title: 'E2E Terminal' })
      const program = await window.programs.get(programId)
      await window.programs.update({
        ...program,
        courses: [{ code: null, courseId, snapshot: { locales: { en: { description: '', title: 'E2E Themed course' } }, publisherId: null, supportedLocales: ['en'], version: null } }],
        theme: { background: '#0b0f0c', foreground: '#d1fae5', primary: '#22c55e' },
      })
      await window.preferences.set({ theme: 'light' })
      return { courseId, programId }
    })
    await page.reload()
    await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
    const rootTheme = () =>
      page.evaluate(() => ({
        background: document.documentElement.style.getPropertyValue('--background'),
        dark: document.documentElement.classList.contains('dark'),
      }))

    await page.evaluate((id) => {
      location.hash = `#/programs/${id}`
    }, ids.programId)
    await page.locator('[data-testid="program-page"]').waitFor({ timeout: 15_000 })
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '#0b0f0c', dark: true })

    // Into one of its courses: still the program's theme.
    await page.getByRole('link', { name: 'E2E Themed course' }).click()
    await waitForUrl(page, `#/courses/${ids.courseId}`)
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '#0b0f0c', dark: true })

    // Anywhere else: the app's own colors (light, as set).
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '', dark: false })

    // The editor previews a change at once, before it's saved.
    await page.evaluate((id) => {
      location.hash = `#/my-programs/${id}`
    }, ids.programId)
    await page.locator('[data-testid="program-color-background"]').waitFor({ timeout: 15_000 })
    await page.locator('[data-testid="program-color-background"]').fill('#101820')
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '#101820', dark: true })

    // A channel (SLJ-31) too: its page, and My channel's live preview.
    const channelId = await page.evaluate(async () => {
      const { programId } = await window.channels.own()
      const channel = await window.programs.get(programId)
      await window.programs.update({ ...channel, theme: { background: '#0b0f0c', foreground: '#d1fae5', primary: '#22c55e' } })
      return programId
    })
    await page.evaluate((id) => {
      location.hash = `#/channels/${id}`
    }, channelId)
    await page.locator('[data-testid="channel-page"]').waitFor({ timeout: 15_000 })
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '#0b0f0c', dark: true })
    await page.evaluate(() => {
      location.hash = '#/my-channel'
    })
    await page.locator('[data-testid="program-color-background"]').waitFor({ timeout: 15_000 })
    await page.locator('[data-testid="program-color-background"]').fill('#202830')
    await expect.poll(rootTheme, { timeout: 10_000 }).toEqual({ background: '#202830', dark: true })

    // "Use program colors" off: the program's page keeps the app's colors.
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await page.click('label[for="settings-use-program-themes"]')
    await page.evaluate((id) => {
      location.hash = `#/programs/${id}`
    }, ids.programId)
    await page.locator('[data-testid="program-page"]').waitFor({ timeout: 15_000 })
    await page.waitForTimeout(500)
    expect(await rootTheme()).toEqual({ background: '', dark: false })
    await page.evaluate(() => window.preferences.set({ useProgramThemes: true }))
  })
})

// The Publisher name: the publishing identity's setup suggests the profile
// name, and shows how students will see it, or the Publisher ID alone.
describe('publisher name', () => {
  it('starts as the profile name in the identity setup, and can be cleared', async () => {
    const { page } = harness
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await page.click('[data-testid="open-set-up-identity"]')
    await page.click('[data-testid="identity-next"]')

    const input = page.locator('[data-testid="publisher-name-input"]')
    const hint = page.locator('[data-testid="publisher-name-hint"]')
    expect(await input.inputValue()).toBe(NICKNAME)
    expect(await hint.textContent()).toContain(`${NICKNAME} (4y9dgb89…)`)

    await input.fill('')
    expect(await hint.textContent()).toContain('4y9dgb89…')
    expect(await hint.textContent()).not.toContain(NICKNAME)

    await page.keyboard.press('Escape')
    await page.locator('[data-testid="set-up-identity-dialog"]').waitFor({ state: 'detached' })
    expect((await page.evaluate(() => window.preferences.get())).publisherName).toBeUndefined()
  })
})

// Full screen for writing a document: the window goes full screen and the
// app's chrome (title bar, sidebar, explorer, toolbars) steps aside; Esc and
// "Exit full screen" bring it back. Last in this file: it changes the window.
describe('document full screen', () => {
  it('hides the chrome in a full-screen window, and Esc or Exit full screen restores it', async () => {
    const { app, page } = harness
    const courseId = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Full Screen Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      await window.courses.createLesson({ courseId, sectionId, title: 'Full screen document' })
      return courseId
    })
    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, courseId)
    await page.getByText('Full screen document', { exact: true }).first().click()
    const isWindowFullScreen = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())
    // The app sidebar's menu: there outside full screen, gone inside it.
    const chromeShown = async () => (await page.locator('[data-testid="app-menu"]').count()) > 0

    await page.click('[data-testid="document-full-screen"]')
    await page.locator('[data-testid="exit-full-screen"]').waitFor()
    // Up to macOS, which doesn't while the display is off (launchApp keeps it
    // on, but can't turn it back on once it's off before the run).
    await expect
      .poll(isWindowFullScreen, {
        message: "the window didn't go full screen: was the display off?",
        timeout: 10_000,
      })
      .toBe(true)
    expect(await chromeShown()).toBe(false)
    // Only the text: the title field stays in the normal view.
    expect(await page.locator('[id^="draft-document-title-"]').count()).toBe(0)
    await page.locator('.bn-editor').waitFor()

    await page.keyboard.press('Escape')
    await page.locator('[data-testid="exit-full-screen"]').waitFor({ state: 'detached' })
    await expect.poll(isWindowFullScreen, { timeout: 10_000 }).toBe(false)
    expect(await chromeShown()).toBe(true)
    expect(await page.locator('[id^="draft-document-title-"]').count()).toBe(1)

    await page.click('[data-testid="document-full-screen"]')
    await page.locator('[data-testid="exit-full-screen"]').click()
    await expect.poll(isWindowFullScreen, { timeout: 10_000 }).toBe(false)
    expect(await chromeShown()).toBe(true)
  })
})

// SLJ-64: course lists have three views (table, list, cards) on Home, My
// courses and a program's page; each page remembers its own.
describe('course list views', () => {
  async function chooseView(page, view) {
    await page.click('[data-testid="view-options"]')
    await page.click(`[data-testid="view-option-${view}"]`)
  }

  it('switches Home, My courses and a program page between views, and each keeps its choice', async () => {
    const { page } = harness
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await chooseView(page, 'cards')
    await page.locator('[data-testid="course-card-compact"]').first().waitFor({ timeout: 15_000 })

    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await chooseView(page, 'list')
    await page.locator('[data-testid="course-card"]').first().waitFor({ timeout: 15_000 })
    expect(await page.locator('[data-testid="course-card-compact"]').count()).toBe(0)

    // A program, not a channel (SLJ-31: listed alongside, with no courses here).
    const programId = await page.evaluate(async () => (await window.programs.list('en')).find((program) => program.kind === 'program')?.id)
    expect(programId).toBeTruthy()
    await page.evaluate((id) => {
      location.hash = `#/programs/${id}`
    }, programId)
    await page.locator('[data-testid="program-page"]').waitFor()
    await chooseView(page, 'cards')
    await page.locator('[data-testid="program-course"] [data-slot="card"]').first().waitFor({ timeout: 15_000 })

    // After a reload (preferences read again from the main process), each page
    // shows the view chosen for it.
    await page.reload()
    await page.locator('[data-testid="program-course"] [data-slot="card"]').first().waitFor({ timeout: 15_000 })
    await page.evaluate(() => {
      location.hash = '#/'
    })
    await page.locator('[data-testid="course-card-compact"]').first().waitFor({ timeout: 15_000 })
    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await page.locator('[data-testid="course-card"]').first().waitFor({ timeout: 15_000 })
    const prefs = await page.evaluate(() => window.preferences.get())
    expect(prefs).toMatchObject({ homeView: 'cards', myCoursesView: 'list', programView: 'cards' })

    // Back to the table everywhere for the tests after this one.
    await page.evaluate(() => window.preferences.set({ homeView: 'table', myCoursesView: 'table', programView: 'table' }))
  })
})


// SLJ-158: the course index beside a lesson. Students jump to any item and see
// their progress; a teacher can switch it off for the course (`courseIndex`
// in course.json, written only when off), which the Commit list reports.
describe('course index', () => {
  it('jumps between lessons with progress, and a teacher can switch it off', async () => {
    const { page } = harness
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Index Course' } },
        supportedLocales: ['en'],
      })
      const lesson = async (sectionId, title) => {
        const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title })
        await window.courses.updateLessonContent({
          courseId,
          lessonId,
          locales: { en: { body: `[matko-block]: <> (markdown)\n${title} text.` } },
          sectionId,
        })
        return lessonId
      }
      const { sectionId: first } = await window.courses.createSection({ courseId, title: 'First part' })
      const { sectionId: second } = await window.courses.createSection({ courseId, title: 'Second part' })
      const firstLesson = await lesson(first, 'Index lesson one')
      const secondLesson = await lesson(first, 'Index lesson two')
      const laterLesson = await lesson(second, 'Index later lesson')
      // A version to compare with, so the switch shows as a change.
      await window.courses.cutVersion({ courseId, releaseType: 'minor' })
      return { courseId, firstLesson, laterLesson, secondLesson }
    })
    const lessonPath = (lessonId) => `#/courses/${ids.courseId}/lessons/${lessonId}`
    const open = (target) =>
      page.evaluate((target) => {
        location.hash = target
      }, target)
    const index = page.locator('[data-testid="course-index"]')
    const row = (title) => index.locator('[data-testid="course-index-item"]', { hasText: title })

    // The index beside the first lesson, that lesson marked as the current one.
    await open(lessonPath(ids.firstLesson))
    await index.waitFor({ timeout: 15_000 })
    await expect.poll(() => row('Index lesson one').getAttribute('data-selected')).toBe('true')

    // Continue marks it done; the index shows it.
    await page.click('[data-testid="lesson-continue"]')
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(lessonPath(ids.secondLesson))
    await row('Index lesson one').locator('[data-testid="step-progress-done"]').waitFor()

    // A lesson in another section, a click away (that section opened first).
    await index.getByText('Second part').click()
    await row('Index later lesson').locator('a').click()
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(lessonPath(ids.laterLesson))
    await expect.poll(() => row('Index later lesson').getAttribute('data-selected')).toBe('true')

    // The teacher switches it off in the course settings: written as
    // `courseIndex: false`, reported in Commit's list of changes.
    await open(`#/drafts/${ids.courseId}`)
    const setting = page.locator('[data-testid="course-index-setting"]')
    await setting.waitFor({ timeout: 15_000 })
    expect(await setting.getAttribute('aria-checked')).toBe('true')
    await setting.click()
    const manifest = () =>
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'courses', ids.courseId, 'draft', 'course.json'), 'utf8'))
    await expect.poll(() => manifest().courseIndex, { timeout: 15_000 }).toBe(false)
    const preview = await page.evaluate((courseId) => window.courses.previewDraftChanges(courseId), ids.courseId)
    expect(preview.changes).toContainEqual({ field: 'courseIndex', kind: 'edited', target: 'course' })

    // No index in the player now.
    await open(lessonPath(ids.firstLesson))
    await page.locator('[data-testid="lesson-continue"]').waitFor({ timeout: 15_000 })
    await page.waitForTimeout(500)
    expect(await index.count()).toBe(0)
    // No left panel and no toggle for it (the player has no other left panel).
    expect(await page.locator('[data-slot="page-side-panel"][data-side="left"]').count()).toBe(0)
    expect(await page.getByRole('button', { name: /course index|sadržaj kursa|садржај курса/i }).count()).toBe(0)
  })
})
