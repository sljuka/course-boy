import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import IdEncoding from 'hypercore-id-encoding'
import { verifySource } from './course-source.cjs'

const driveKey = crypto.randomBytes(32)
const otherDriveKey = crypto.randomBytes(32)
const source = (key, publisherId = 'publisher-key') =>
  JSON.stringify({ driveKey: IdEncoding.normalize(key), publisher: { id: publisherId } })

describe('verifySource', () => {
  it('accepts a source.json naming the drive the course came from, in any key encoding', () => {
    expect(verifySource(source(driveKey), driveKey)).toBe('publisher-key')
    expect(verifySource(source(driveKey), IdEncoding.normalize(driveKey))).toBe('publisher-key')
    expect(verifySource(source(driveKey), driveKey.toString('hex'))).toBe('publisher-key')
  })

  it('refuses a source.json naming another drive (a re-shared copy)', () => {
    expect(() => verifySource(source(otherDriveKey), driveKey)).toThrow(/different address/)
  })

  it('refuses a missing or malformed source.json', () => {
    expect(() => verifySource(null, driveKey)).toThrow(/no valid source.json/)
    expect(() => verifySource('{not json', driveKey)).toThrow(/no valid source.json/)
    expect(() => verifySource(JSON.stringify({ publisher: {} }), driveKey)).toThrow(/no valid source.json/)
    expect(() => verifySource(JSON.stringify({ driveKey: 'nope' }), driveKey)).toThrow(/different address/)
  })

  it('returns an empty publisher id when none is claimed', () => {
    expect(verifySource(JSON.stringify({ driveKey: IdEncoding.normalize(driveKey) }), driveKey)).toBe('')
  })
})
