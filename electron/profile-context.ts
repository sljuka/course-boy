// Which profile is open (SLJ-57), and where its data lives. The app's data
// folder (Electron's userData, or `--user-data-dir`) holds:
//
//   profiles/<slug>-<16 chars>/   one per person: courses/, p2p/, the stores…
//   launcher/                     the launcher's own preferences (its language)
//   browser/                      Chromium's own data (cache…), shared by all
//                                 profiles: it can't move once the app runs
//   profiles.json                 { lastUsedId }
//
// Switching profiles happens in the running app (see switchProfile in
// main.ts): the window and process stay, everything per person is reopened
// from the new folder. So nothing personal may live in Chromium's storage
// (localStorage, IndexedDB): it would be shared by every profile.

import { app } from 'electron'
import path from 'node:path'

import type { ProfileSummary } from '../src/lib/profiles'
import { chooseStartupProfile, listProfiles, setLastUsedProfile } from './profiles'

let baseDataDir: string | null = null
let active: ProfileSummary | null = null

// Main calls this first, before the app is ready: it reads the data folder,
// moves Chromium's data into browser/, and opens the profile the arguments or
// the folders say (`--profile=<id>`, else the only one, else the launcher).
export function initProfiles(argv: readonly string[]): void {
  baseDataDir = app.getPath('userData')
  app.setPath('userData', path.join(baseDataDir, 'browser'))

  const choice = chooseStartupProfile(baseDataDir, argv)
  active = choice.kind === 'profile' ? choice.profile : null
  if (active) setLastUsedProfile(baseDataDir, active.id)
}

export function getBaseDataDir(): string {
  return baseDataDir ?? app.getPath('userData')
}

// The open profile, or null in the launcher.
export function getActiveProfile(): ProfileSummary | null {
  return active
}

// Where the open profile keeps its data (the launcher's folder when none is
// open). Unit tests that never call initProfiles get Electron's userData.
export function getProfileDataDir(): string {
  if (!baseDataDir) return app.getPath('userData')
  return active ? path.join(baseDataDir, 'profiles', active.id) : path.join(baseDataDir, 'launcher')
}

// Makes another profile (or the launcher, with null) the open one. The caller
// closes and reopens everything per profile around it.
export function setActiveProfile(profileId: string | null): void {
  const base = getBaseDataDir()
  active = profileId ? (listProfiles(base).find((profile) => profile.id === profileId) ?? null) : null
  if (active) setLastUsedProfile(base, active.id)
}
