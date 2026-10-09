import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import IdEncoding from 'hypercore-id-encoding'
import { movedToKey, unchangedFileKeys, verifySource } from './course-source.cjs'

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

describe('movedToKey', () => {
  const moved = (key, target) => JSON.stringify({ driveKey: IdEncoding.normalize(key), movedTo: { driveKey: target } })

  it("returns the new drive named by the drive's own source.json", () => {
    expect(movedToKey(moved(driveKey, IdEncoding.normalize(otherDriveKey)), driveKey)).toBe(IdEncoding.normalize(otherDriveKey))
    expect(movedToKey(moved(driveKey, otherDriveKey.toString('hex')), driveKey)).toBe(IdEncoding.normalize(otherDriveKey))
  })

  it("ignores a notice that isn't this drive's, points to itself, or isn't a key", () => {
    expect(movedToKey(moved(otherDriveKey, IdEncoding.normalize(crypto.randomBytes(32))), driveKey)).toBeNull()
    expect(movedToKey(moved(driveKey, IdEncoding.normalize(driveKey)), driveKey)).toBeNull()
    expect(movedToKey(moved(driveKey, 'not a key'), driveKey)).toBeNull()
    expect(movedToKey(source(driveKey), driveKey)).toBeNull()
    expect(movedToKey('{', driveKey)).toBeNull()
    expect(movedToKey(null, driveKey)).toBeNull()
  })
})

describe('unchangedFileKeys', () => {
  const hash = (text) => crypto.createHash('sha256').update(text).digest('hex')
  const meta = (fileHashes) => JSON.stringify({ cutAt: '', fileHashes, releaseType: 'minor' })

  it('lists the files whose hashes match, as drive paths', () => {
    const remote = meta({ 'assets/pic.png': hash('pic'), 'course.json': hash('new'), 'section\\lesson.json': hash('l') })
    const local = meta({ 'assets/pic.png': hash('pic'), 'course.json': hash('old'), 'section\\lesson.json': hash('l') })
    expect([...unchangedFileKeys(remote, local)].sort()).toEqual(['/assets/pic.png', '/section/lesson.json'])
  })

  it('skips nothing when either version-meta.json is missing or damaged', () => {
    expect(unchangedFileKeys(null, meta({ a: hash('a') })).size).toBe(0)
    expect(unchangedFileKeys(meta({ a: hash('a') }), '{').size).toBe(0)
    expect(unchangedFileKeys(meta({ a: 'not-a-hash' }), meta({ a: 'not-a-hash' })).size).toBe(0)
  })
})
