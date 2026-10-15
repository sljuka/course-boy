// What the sharing e2e files share (SLJ-69): each file is one area, with its own
// folder, its own local DHT testnet (`hyperdht/testnet`, passed to each app's
// worker as MATKO_DHT_BOOTSTRAP, so nothing touches the public network) and its
// own apps, all closed when the file ends. A file can run on its own, and one
// area's leftovers (apps, stale announcements) never slow another down.

import { afterAll, beforeAll, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import createTestnet from 'hyperdht/testnet.js'
import { recordFailures } from './failures.mjs'
import { launchApp, profileDataDir, waitFor } from './launch.mjs'

// SLJ-55: one password, one file. Publishing online starts with setting up the
// publishing identity (the wizard, here through its IPC call); after a restart
// it's locked until the password is given (the screen before Home).
export const IDENTITY_PASSWORD = 'correct horse battery'

// The DHT nodes of a file's testnet: enough that a few apps announcing and
// looking up at once don't wait on each other.
const TESTNET_NODES = 5

// A file's apps and network. `names` maps each app instance to its folder.
export function sharingSuite(area, names) {
  const ROOT = `/tmp/matko-e2e-sharing-${area}`
  const dirs = Object.fromEntries(Object.entries(names).map(([name, folder]) => [name, path.join(ROOT, folder)]))
  // Where each instance keeps its data: its e2e profile's folder (SLJ-57).
  const data = Object.fromEntries(Object.entries(dirs).map(([name, dir]) => [name, profileDataDir(dir)]))
  const apps = {}
  recordFailures(`sharing-${area}`, () => apps)
  let testnet
  let env

  beforeAll(async () => {
    fs.rmSync(ROOT, { force: true, recursive: true })
    testnet = await createTestnet(TESTNET_NODES)
    env = { MATKO_DHT_BOOTSTRAP: testnet.bootstrap.map(({ host, port }) => `${host}:${port}`).join(',') }
  })

  afterAll(async () => {
    for (const name of Object.keys(apps)) await close(name)
    await testnet?.destroy()
    fs.rmSync(ROOT, { force: true, recursive: true })
  })

  async function launch(name, { fresh = true, extraEnv = {} } = {}) {
    apps[name] = await launchApp({ env: { ...env, ...extraEnv }, fresh, userData: dirs[name] })
    return apps[name].page
  }

  async function close(name) {
    await apps[name]?.close()
    delete apps[name]
  }

  const identityFilePath = (name) => path.join(data[name], 'publisher-identity.matko-identity')

  return { ROOT, apps, close, data, dirs, identityFilePath, launch }
}

export async function setUpIdentity(page) {
  expect(await page.evaluate((password) => window.sharing.setUpIdentity(password), IDENTITY_PASSWORD)).toEqual({ ok: true })
}

export async function unlockIdentity(page) {
  expect(await page.evaluate((password) => window.sharing.unlockIdentity(password), IDENTITY_PASSWORD)).toEqual({
    unlocked: true,
  })
  await page.reload()
  await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
}

// Sharing runs in the background after Publish/startup; poll its status.
export async function waitForSharing(page, courseId, predicate, timeout = 30_000) {
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

export async function writeLesson(page, ids, text) {
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

export async function cutAndPublish(page, courseId, { releaseType = 'minor', recommended = false } = {}) {
  const { version } = await page.evaluate((input) => window.courses.cutVersion(input), {
    courseId,
    recommended,
    releaseType,
  })
  await page.evaluate(({ courseId, version }) => window.courses.publishVersion({ courseId, version }), {
    courseId,
    version,
  })
  return version
}

// The pending update of an imported course, once the student's app has seen it.
export function waitForUpdate(page, courseId, predicate, timeout = 30_000) {
  return waitForSharing(page, courseId, (info) => Boolean(info.update) && predicate(info.update), timeout)
}

// Onboarded, and at Home like a person who just finished onboarding (a
// reload keeps the onboarding route, which nothing leaves on its own).
export async function finishOnboarding(page, role) {
  await page.evaluate(
    (role) => window.preferences.set({ category: 'other', nickname: 'E2E', persona: 'course-boy', role }),
    role,
  )
  await page.reload()
  await waitFor(page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
  await page.evaluate(() => {
    location.hash = '#/'
  })
  await page.locator('[data-testid="app-menu"]').waitFor({ timeout: 15_000 })
}

// An imported course is kept as versions/<v>/ + release.json (SLJ-40).
export function currentVersionDir(userData, courseId) {
  const courseRoot = path.join(userData, 'courses', courseId)
  const { publishedVersion } = JSON.parse(fs.readFileSync(path.join(courseRoot, 'release.json'), 'utf8'))
  return path.join(courseRoot, 'versions', publishedVersion)
}

// The current version's files, relative to its folder.
export function currentVersionFiles(userData, courseId) {
  const dir = currentVersionDir(userData, courseId)
  return fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.md') || file.endsWith('.json'))
    .map((file) => ({ dir, file, path: path.join(dir, file) }))
}

// SLJ-55: whether any file under `dir` contains `secret`'s bytes (the store's
// RocksDB logs and tables hold keys as raw bytes, as the SLJ-46 spike showed).
export function anyFileHolds(dir, secret) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map((file) => path.join(dir, String(file)))
    .filter((file) => fs.statSync(file).isFile())
    .some((file) => fs.readFileSync(file).includes(Buffer.from(secret)))
}

export async function importCourse(page, code) {
  return page.evaluate((code) => window.sharing.importCourse({ code }), code)
}
