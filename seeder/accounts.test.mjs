import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  checkPassword,
  createAccount,
  createSession,
  endSession,
  hasAccounts,
  listAccounts,
  removeAccount,
  sessionAccount,
  setPassword,
} from './accounts.mjs'

// SLJ-194: the seeder page's accounts; the first is the admin.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-seeder-accounts-'))
afterAll(() => fs.rmSync(root, { force: true, recursive: true }))
const fresh = () => fs.mkdtempSync(path.join(root, 'data-'))

describe('seeder accounts (seeder/accounts.mjs)', () => {
  it('makes the first account the admin, and the others not', () => {
    const dataDir = fresh()
    expect(hasAccounts(dataDir)).toBe(false)
    expect(createAccount(dataDir, { name: ' Ana ', password: 'correct horse' })).toEqual({ admin: true, name: 'Ana' })
    expect(createAccount(dataDir, { name: 'Marko', password: 'battery staple' })).toEqual({ admin: false, name: 'Marko' })
    expect(listAccounts(dataDir).map(({ admin, name }) => ({ admin, name }))).toEqual([
      { admin: true, name: 'Ana' },
      { admin: false, name: 'Marko' },
    ])
  })

  it('keeps hashes, not passwords, in a file only its owner can read', () => {
    const dataDir = fresh()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    const file = path.join(dataDir, 'accounts.json')
    expect(fs.readFileSync(file, 'utf8')).not.toContain('correct horse')
    if (process.platform !== 'win32') expect(fs.statSync(file).mode & 0o077).toBe(0)
    expect(listAccounts(dataDir)[0]).not.toHaveProperty('hash')
  })

  it('checks a password, with the name in any case', () => {
    const dataDir = fresh()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    expect(checkPassword(dataDir, 'ana', 'correct horse')).toEqual({ admin: true, name: 'Ana' })
    expect(checkPassword(dataDir, 'Ana', 'wrong horse')).toBeNull()
    expect(checkPassword(dataDir, 'Nobody', 'correct horse')).toBeNull()
  })

  it('refuses an empty or long name, a short password, and a name taken in any case', () => {
    const dataDir = fresh()
    expect(() => createAccount(dataDir, { name: '  ', password: 'correct horse' })).toThrow(expect.objectContaining({ code: 'name' }))
    expect(() => createAccount(dataDir, { name: 'x'.repeat(33), password: 'correct horse' })).toThrow(expect.objectContaining({ code: 'name' }))
    expect(() => createAccount(dataDir, { name: 'Ana', password: 'short' })).toThrow(expect.objectContaining({ code: 'password' }))
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    expect(() => createAccount(dataDir, { name: 'ANA', password: 'correct horse' })).toThrow(expect.objectContaining({ code: 'taken' }))
  })

  it("never removes the admin; removing another account or resetting a password ends that account's sessions", () => {
    const dataDir = fresh()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    createAccount(dataDir, { name: 'Marko', password: 'battery staple' })
    expect(() => removeAccount(dataDir, 'ana')).toThrow(expect.objectContaining({ code: 'admin' }))
    expect(() => removeAccount(dataDir, 'Nobody')).toThrow(expect.objectContaining({ code: 'unknown' }))

    const admin = createSession(dataDir, 'Ana')
    const first = createSession(dataDir, 'Marko')
    setPassword(dataDir, 'marko', 'new staple!')
    expect(sessionAccount(dataDir, first)).toBeNull()
    expect(checkPassword(dataDir, 'Marko', 'new staple!')).toEqual({ admin: false, name: 'Marko' })

    const second = createSession(dataDir, 'Marko')
    removeAccount(dataDir, 'Marko')
    expect(sessionAccount(dataDir, second)).toBeNull()
    expect(sessionAccount(dataDir, admin)).toEqual({ admin: true, name: 'Ana' })
  })

  it('keeps sessions by a hash of their token, ends them on sign-out, and lets them expire unless used', () => {
    const dataDir = fresh()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    const start = new Date('2026-11-01T00:00:00Z')
    const token = createSession(dataDir, 'Ana', start)
    expect(fs.readFileSync(path.join(dataDir, 'sessions.json'), 'utf8')).not.toContain(token)
    expect(sessionAccount(dataDir, 'not a token', start)).toBeNull()

    // Used on day 20, so it lasts until day 50, not day 30.
    expect(sessionAccount(dataDir, token, new Date('2026-11-21T00:00:00Z'))).toEqual({ admin: true, name: 'Ana' })
    expect(sessionAccount(dataDir, token, new Date('2026-12-15T00:00:00Z'))).toEqual({ admin: true, name: 'Ana' })
    expect(sessionAccount(dataDir, token, new Date('2027-02-01T00:00:00Z'))).toBeNull()

    const other = createSession(dataDir, 'Ana')
    endSession(dataDir, other)
    expect(sessionAccount(dataDir, other)).toBeNull()
  })
})
