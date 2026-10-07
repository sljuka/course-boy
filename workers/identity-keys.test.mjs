import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import Corestore from 'corestore'
import { courseKeyPair, creatorKeyPair, publicCourseId } from './identity-keys.cjs'
import { isValidCourseId } from './course-id.cjs'

// The codes of courses published before SLJ-55 came from Corestore's own
// derivation, with the identity as the store's seed. Ours must match it.
describe('identity keys', () => {
  it('derives the same course and creator keys as Corestore', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-identity-keys-'))
    const identity = crypto.randomBytes(32)
    const store = new Corestore(dir, { primaryKey: identity, unsafe: true })

    try {
      await store.ready()
      const course = courseKeyPair(identity, 'abcdefghijklmn23')
      const expectedCourse = await store.namespace('course-abcdefghijklmn23').createKeyPair('db')
      expect(Buffer.from(course.publicKey).equals(expectedCourse.publicKey)).toBe(true)
      expect(Buffer.from(course.secretKey).equals(expectedCourse.secretKey)).toBe(true)

      const creator = creatorKeyPair(identity)
      expect(Buffer.from(creator.publicKey).equals((await store.createKeyPair('creator')).publicKey)).toBe(true)
    } finally {
      await store.close()
      fs.rmSync(dir, { force: true, recursive: true })
    }
  })

  it("gives each course a public id from the identity's secret and a number", () => {
    const identity = crypto.randomBytes(32)
    const ids = [0, 1, 2, 3].map((index) => publicCourseId(identity, index))

    // Shaped like a course id, different per number, the same every time.
    expect(ids.every(isValidCourseId)).toBe(true)
    expect(new Set(ids).size).toBe(4)
    expect(publicCourseId(identity, 2)).toBe(ids[2])
    // Another identity (or its public key alone) gives unrelated ids.
    expect(publicCourseId(crypto.randomBytes(32), 0)).not.toBe(ids[0])
    expect(() => publicCourseId(identity, -1)).toThrow()
  })

  it('refuses a key that is not 32 bytes', () => {
    expect(() => creatorKeyPair(Buffer.alloc(16))).toThrow(/32 bytes/)
  })
})
