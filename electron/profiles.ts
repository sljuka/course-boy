// Profile folders (SLJ-57). The app's data folder (`baseDir`, Electron's
// userData, or `--user-data-dir`) holds:
//
//   profiles/<slug>-<16 chars>/   one per person: profile.json, plus everything
//                                 the app keeps (courses/, p2p/, stores…)
//   profiles.json                 { lastUsedId }
//   (and launcher/, browser/: see profile-context.ts)
//
// The folders are the truth: the list comes from scanning profiles/, so it
// can't drift from what's on disk. A profile's folder name is its id and never
// changes; renaming only edits profile.json.

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { Persona } from '../src/lib/preferences'
import {
  checkProfileName,
  createProfileId,
  PROFILE_FOLDER_PATTERN,
  type ProfileSummary,
} from '../src/lib/profiles'

const PERSONAS: readonly Persona[] = ['course-boy', 'course-girl', 'course-bot', 'course-monster']
const MAX_CREATE_ATTEMPTS = 5

type ProfileFile = { createdAt: string; name: string; persona?: Persona | null }

export function profilesRoot(baseDir: string): string {
  return path.join(baseDir, 'profiles')
}

export function profileDir(baseDir: string, id: string): string {
  if (!PROFILE_FOLDER_PATTERN.test(id)) {
    throw new Error(`Invalid profile id "${id}"`)
  }
  return path.join(profilesRoot(baseDir), id)
}

function readProfile(baseDir: string, id: string): ProfileSummary | null {
  if (!PROFILE_FOLDER_PATTERN.test(id)) return null
  try {
    const file = JSON.parse(fs.readFileSync(path.join(profileDir(baseDir, id), 'profile.json'), 'utf8')) as Partial<ProfileFile>
    if (typeof file.name !== 'string' || typeof file.createdAt !== 'string') return null
    return {
      createdAt: file.createdAt,
      id,
      name: file.name,
      persona: PERSONAS.includes(file.persona as Persona) ? (file.persona as Persona) : null,
    }
  } catch {
    return null
  }
}

function readLastUsedId(baseDir: string): string | null {
  try {
    const { lastUsedId } = JSON.parse(fs.readFileSync(path.join(baseDir, 'profiles.json'), 'utf8'))
    return typeof lastUsedId === 'string' ? lastUsedId : null
  } catch {
    return null
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2))
  fs.renameSync(tempPath, filePath)
}

// Every profile, the last used first, then the newest. Synchronous: the
// choice is made before the app is ready (see profile-context.ts).
export function listProfiles(baseDir: string): ProfileSummary[] {
  let names: string[] = []
  try {
    names = fs.readdirSync(profilesRoot(baseDir))
  } catch {
    return []
  }

  const lastUsedId = readLastUsedId(baseDir)
  return names
    .map((name) => readProfile(baseDir, name))
    .filter((profile): profile is ProfileSummary => profile !== null)
    .sort((left, right) =>
      left.id === lastUsedId ? -1 : right.id === lastUsedId ? 1 : right.createdAt.localeCompare(left.createdAt),
    )
}

export function setLastUsedProfile(baseDir: string, id: string): void {
  writeJsonAtomic(path.join(baseDir, 'profiles.json'), { lastUsedId: id })
}

// A new profile: its folder first (a non-recursive mkdir fails with EEXIST
// rather than reuse one, so a clash, practically impossible with 16 random
// characters, just draws another id), then profile.json.
export function createProfile(
  baseDir: string,
  input: { name: string },
  { now = () => new Date(), random = (length: number) => new Uint8Array(randomBytes(length)) } = {},
): ProfileSummary {
  const check = checkProfileName(input.name)
  if (!check.ok) {
    throw new Error(check.problem === 'empty' ? 'Enter a name' : 'The name is too long')
  }

  fs.mkdirSync(profilesRoot(baseDir), { recursive: true })

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const id = createProfileId(check.name, random)
    try {
      fs.mkdirSync(profileDir(baseDir, id))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue
      throw error
    }

    const profile: ProfileFile = { createdAt: now().toISOString(), name: check.name, persona: null }
    writeJsonAtomic(path.join(profileDir(baseDir, id), 'profile.json'), profile)
    return { ...profile, id, persona: null }
  }

  throw new Error('Could not create a profile folder')
}

// Keeps profile.json in step with the profile's own preferences (the name
// typed in onboarding, the persona picked), for the picker.
export function updateProfile(baseDir: string, id: string, patch: { name?: string; persona?: Persona | null }): void {
  const current = readProfile(baseDir, id)
  if (!current) return

  // A name that breaks the rules (empty, too long) is ignored, not stored.
  const check = patch.name === undefined ? null : checkProfileName(patch.name)
  const name = check?.ok ? check.name : current.name

  writeJsonAtomic(path.join(profileDir(baseDir, id), 'profile.json'), {
    createdAt: current.createdAt,
    name,
    persona: patch.persona === undefined ? current.persona : patch.persona,
  } satisfies ProfileFile)
}

export type StartupChoice = { kind: 'profile'; profile: ProfileSummary } | { kind: 'launcher' }

// Which profile the app opens at start:
// - `--profile=<id>`, if it exists (tests, development);
// - exactly one profile: that one;
// - none or several: the launcher (the name screen or the picker).
export function chooseStartupProfile(baseDir: string, argv: readonly string[]): StartupChoice {
  const profiles = listProfiles(baseDir)
  const requested = argv.find((arg) => arg.startsWith('--profile='))?.slice('--profile='.length)

  if (requested) {
    const profile = profiles.find((candidate) => candidate.id === requested)
    if (profile) return { kind: 'profile', profile }
  }

  if (profiles.length !== 1) {
    return { kind: 'launcher' }
  }

  return { kind: 'profile', profile: profiles[0] }
}
