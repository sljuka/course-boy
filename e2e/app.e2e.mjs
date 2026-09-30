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
      'publishVersion',
      'remove',
      'revertToVersion',
      'saveLessonTest',
      'saveSectionTest',
      'updateDraftMetadata',
      'updateLessonContent',
      'updateSection',
      'updateSectionTestMetadata',
      'uploadAsset',
      'uploadAssetBytes',
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
      explorerPanels: document.querySelectorAll('[data-slot=page-side-panel]').length,
    }))
    expect(rows.actionBar).toContain('Preview course')
    expect(rows.toolbar).not.toContain('Preview course')
    expect(rows.explorerPanels).toBe(1)
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
      await waitFor(page, () => Boolean(document.querySelector('.bn-editor')))
      await sleep(500)
    }
    const waitForFile = async (predicate) => {
      const deadline = Date.now() + 15_000
      while (Date.now() < deadline) {
        const text = fs.readFileSync(lessonFile(), 'utf8')
        if (predicate(text)) return text
        await sleep(250)
      }
      throw new Error(`lesson file never matched: ${fs.readFileSync(lessonFile(), 'utf8')}`)
    }

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

describe('runtime health', () => {
  it('logged no uncaught renderer errors', () => {
    expect(harness.errors).toEqual([])
  })
})
