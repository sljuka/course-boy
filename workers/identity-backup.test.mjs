import crypto from 'node:crypto'
import sodium from 'sodium-native'
import { describe, expect, it } from 'vitest'
import { createIdentityBackup, openIdentityBackup, readIdentityBackup } from './identity-backup.cjs'

// Fast limits for tests; real backups use the moderate defaults.
const limits = { memlimit: sodium.crypto_pwhash_MEMLIMIT_MIN, opslimit: sodium.crypto_pwhash_OPSLIMIT_MIN }
const primaryKey = crypto.randomBytes(32)
const courses = [{ id: 'abc123', title: 'Fractions' }]
const make = (password = 'correct horse') =>
  createIdentityBackup({ courses, limits, password, primaryKey, publisherId: 'publisher-key' })

describe('identity backup file', () => {
  it('opens with the right password: the same identity and courses', () => {
    const opened = openIdentityBackup(make(), 'correct horse')
    expect(opened.primaryKey.equals(primaryKey)).toBe(true)
    expect(opened.courses).toEqual(courses)
    expect(opened.publisherId).toBe('publisher-key')
  })

  it('keeps the key and the course list out of the readable part', () => {
    const text = make()
    expect(text).not.toContain(primaryKey.toString('base64'))
    expect(text).not.toContain(primaryKey.toString('hex'))
    expect(text).not.toContain('Fractions')
    expect(readIdentityBackup(text)).toMatchObject({ publisherId: 'publisher-key' })
  })

  it('refuses a wrong password, and an edited file the same way', () => {
    expect(() => openIdentityBackup(make(), 'wrong horse!')).toThrow(expect.objectContaining({ code: 'WRONG_PASSWORD' }))

    const file = JSON.parse(make())
    const bytes = Buffer.from(file.cipher.ciphertext, 'base64')
    bytes[0] ^= 1
    file.cipher.ciphertext = bytes.toString('base64')
    expect(() => openIdentityBackup(JSON.stringify(file), 'correct horse')).toThrow(
      expect.objectContaining({ code: 'WRONG_PASSWORD' }),
    )
  })

  it('matches the password however its letters are composed (NFC)', () => {
    const text = make('čarobnjak-ć')
    expect(openIdentityBackup(text, 'čarobnjak-ć'.normalize('NFD')).primaryKey.equals(primaryKey)).toBe(true)
  })

  it('refuses a short password', () => {
    expect(() => make('short')).toThrow(expect.objectContaining({ code: 'WEAK_PASSWORD' }))
  })

  it('validates the format before asking for a password', () => {
    expect(() => readIdentityBackup('not json')).toThrow(expect.objectContaining({ code: 'INVALID_FILE' }))
    expect(() => readIdentityBackup('{"format":"something-else"}')).toThrow(expect.objectContaining({ code: 'INVALID_FILE' }))
    expect(() => readIdentityBackup(JSON.stringify({ ...JSON.parse(make()), formatVersion: 2 }))).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_VERSION' }),
    )
    const greedy = JSON.parse(make())
    greedy.kdf.memlimit = 8 * 1024 * 1024 * 1024
    expect(() => readIdentityBackup(JSON.stringify(greedy))).toThrow(expect.objectContaining({ code: 'INVALID_FILE' }))
  })
})
