import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { chooseStartupProfile, createProfile, listProfiles, setLastUsedProfile, updateProfile } from './profiles'

let baseDir = ''
beforeEach(() => {
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-profiles-'))
})
afterEach(() => fs.rmSync(baseDir, { force: true, recursive: true }))

describe('profiles', () => {
  it('creates a folder per profile with its name, and lists them', () => {
    const ana = createProfile(baseDir, { name: ' Ana Petrović ' })

    expect(ana.id).toMatch(/^ana-petrovic-[a-z0-9]{16}$/)
    expect(ana.name).toBe('Ana Petrović')
    expect(fs.existsSync(path.join(baseDir, 'profiles', ana.id, 'profile.json'))).toBe(true)
    expect(listProfiles(baseDir)).toEqual([ana])
  })

  it('draws another id when the folder already exists', () => {
    let call = 0
    const random = (length: number) => new Uint8Array(length).fill(call++ < 2 ? 0 : 1)
    const first = createProfile(baseDir, { name: 'Ana' }, { random })
    const second = createProfile(baseDir, { name: 'Ana' }, { random })

    expect(first.id).toBe('ana-aaaaaaaaaaaaaaaa')
    expect(second.id).toBe('ana-bbbbbbbbbbbbbbbb')
  })

  it('refuses an empty name', () => {
    expect(() => createProfile(baseDir, { name: '  ' })).toThrow(/Enter a name/)
  })

  it('renames and sets the persona in profile.json only; the folder stays', () => {
    const ana = createProfile(baseDir, { name: 'Ana' })
    updateProfile(baseDir, ana.id, { name: 'Ana P.', persona: 'course-girl' })
    updateProfile(baseDir, ana.id, { name: '   ' })

    expect(listProfiles(baseDir)).toEqual([{ ...ana, name: 'Ana P.', persona: 'course-girl' }])
  })

  it('lists the last used profile first', () => {
    const ana = createProfile(baseDir, { name: 'Ana' }, { now: () => new Date('2026-01-01') })
    const marko = createProfile(baseDir, { name: 'Marko' }, { now: () => new Date('2026-02-01') })

    expect(listProfiles(baseDir).map((profile) => profile.id)).toEqual([marko.id, ana.id])
    setLastUsedProfile(baseDir, ana.id)
    expect(listProfiles(baseDir).map((profile) => profile.id)).toEqual([ana.id, marko.id])
  })

  it('opens the only profile, a requested one, or else the launcher', () => {
    expect(chooseStartupProfile(baseDir, [])).toEqual({ kind: 'launcher' })

    const ana = createProfile(baseDir, { name: 'Ana' })
    expect(chooseStartupProfile(baseDir, [])).toEqual({ kind: 'profile', profile: ana })

    const marko = createProfile(baseDir, { name: 'Marko' })
    expect(chooseStartupProfile(baseDir, [])).toEqual({ kind: 'launcher' })
    expect(chooseStartupProfile(baseDir, [`--profile=${marko.id}`])).toEqual({ kind: 'profile', profile: marko })
    expect(chooseStartupProfile(baseDir, ['--profile=../../etc'])).toEqual({ kind: 'launcher' })
  })
})
