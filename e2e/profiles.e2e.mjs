// SLJ-57: profiles. One folder per person under the app's data folder, each
// with its own courses, publisher identity and preferences. Switching happens
// in the running app: the window stays and reloads in the chosen profile.
//
//   first run → the name screen → a profile folder named after it
//   Switch profile → the picker; New profile → a second folder
//   each profile sees only its own courses and has its own identity
//   the picker opens the one chosen; with several, the app starts there

import { describe, expect, it, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { bodyText, launchApp, waitFor, waitForText } from './launch.mjs'

const USER_DATA = '/tmp/matko-e2e-profiles'
let harness = null

const profileFolders = () => fs.readdirSync(path.join(USER_DATA, 'profiles')).sort()
const profileFile = (id) => JSON.parse(fs.readFileSync(path.join(USER_DATA, 'profiles', id, 'profile.json'), 'utf8'))
const lastUsedId = () => JSON.parse(fs.readFileSync(path.join(USER_DATA, 'profiles.json'), 'utf8')).lastUsedId
const activeProfile = () => harness.page.evaluate(() => window.profiles.getState().then((state) => state.active))

// After a switch the page reloads in the new profile: wait until it reports it.
async function waitForActive(predicate) {
  await expect.poll(async () => predicate(await activeProfile().catch(() => undefined)), { timeout: 20_000 }).toBe(true)
}

async function createProfile(name) {
  const { page } = harness
  await page.locator('[data-testid="create-profile"]').waitFor()
  await page.getByLabel('Username or nickname').fill(name)
  await page.getByRole('button', { name: 'Continue' }).click()
  await waitForActive((active) => active?.name === name)
  // The name was given in the launcher: onboarding goes on from the persona.
  await waitFor(page, () => location.hash.includes('/onboarding/persona'))
}

// Persona and role, as the onboarding pages would set them; then Home.
async function finishOnboarding(persona) {
  const { page } = harness
  await page.evaluate((persona) => window.preferences.set({ category: 'other', persona, role: 'teacher' }), persona)
  await page.reload()
  await page.evaluate(() => {
    location.hash = '#/'
  })
  await page.locator('[data-testid="app-menu"]').waitFor()
}

async function switchToPicker() {
  const { page } = harness
  await page.locator('[data-testid="app-menu"]').click()
  await page.locator('[data-testid="switch-profile"]').click()
  await waitForActive((active) => active === null)
  await page.locator('[data-testid="profile-picker"]').waitFor()
}

afterAll(async () => {
  await harness?.close()
  fs.rmSync(USER_DATA, { force: true, recursive: true })
})

describe('profiles', () => {
  let ana
  let anaCourseId
  let anaCreatorKey

  it('a first run asks for a name and opens a new profile folder made from it', async () => {
    harness = await launchApp({ profile: null, userData: USER_DATA })
    await createProfile('Ana Petrović')

    expect(profileFolders()).toEqual([expect.stringMatching(/^ana-petrovic-[a-z0-9]{16}$/)])
    ana = profileFolders()[0]
    expect(profileFile(ana).name).toBe('Ana Petrović')
    expect(lastUsedId()).toBe(ana)
  })

  it("keeps the profile's persona and courses in its folder", async () => {
    const { page } = harness
    await finishOnboarding('course-girl')
    expect(profileFile(ana).persona).toBe('course-girl')

    anaCourseId = (
      await page.evaluate(() =>
        window.courses.createDraft({
          defaultLocale: 'en',
          locales: { en: { description: '', title: "Ana's course" } },
          supportedLocales: ['en'],
        }),
      )
    ).courseId
    anaCreatorKey = await expect
      .poll(() => page.evaluate(() => window.sharing.getCreatorKey().catch(() => null)), { timeout: 20_000 })
      .toBeTruthy()
      .then(() => page.evaluate(() => window.sharing.getCreatorKey()))
    expect(fs.existsSync(path.join(USER_DATA, 'profiles', ana, 'courses', anaCourseId))).toBe(true)
  })

  it('Switch profile shows the picker; a new profile has its own courses and identity', async () => {
    await switchToPicker()
    expect(await bodyText(harness.page)).toContain('Ana Petrović')

    await harness.page.getByRole('button', { name: 'New profile' }).click()
    await createProfile('##$$%')

    const other = profileFolders().find((id) => id !== ana)
    expect(other).toMatch(/^profile-[a-z0-9]{16}$/)
    expect(profileFile(other).name).toBe('##$$%')

    // Onboarding has no sidebar: it offers Switch profile below its card.
    await harness.page.locator('[data-testid="onboarding-switch-profile"]').waitFor()

    const courses = await harness.page.evaluate(() => window.courses.list('en'))
    expect(courses.map((course) => course.id)).not.toContain(anaCourseId)
    // The new profile's worker answers with its own identity.
    await expect
      .poll(() => harness.page.evaluate(() => window.sharing.getCreatorKey().catch(() => null)), { timeout: 20_000 })
      .toMatch(/./)
    expect(await harness.page.evaluate(() => window.sharing.getCreatorKey())).not.toBe(anaCreatorKey)
    await finishOnboarding('course-monster')
  })

  it('the picker lists the last used first and opens the one chosen, in the same window', async () => {
    await switchToPicker()
    const names = await harness.page.locator('[data-testid="open-profile"]').allInnerTexts()
    expect(names.map((name) => name.trim())).toEqual(['##$$%', 'Ana Petrović'])

    await harness.page.locator('[data-testid="open-profile"]', { hasText: 'Ana Petrović' }).click()
    await waitForActive((active) => active?.id === ana)
    expect(lastUsedId()).toBe(ana)
    await expect
      .poll(() => harness.page.evaluate(() => window.sharing.getCreatorKey().catch(() => null)), { timeout: 20_000 })
      .toBe(anaCreatorKey)

    await harness.page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    await waitForText(harness.page, "Ana's course")
  })

  it('with several profiles, the app starts at the picker', async () => {
    await harness.close()
    harness = await launchApp({ fresh: false, profile: null, userData: USER_DATA })
    await harness.page.locator('[data-testid="profile-picker"]').waitFor()
    expect(await activeProfile()).toBeNull()
  })
})
