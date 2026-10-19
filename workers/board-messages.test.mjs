import { describe, expect, it } from 'vitest'
import crypto from 'hypercore-crypto'
import {
  MAX_CLOCK_AHEAD_MS,
  countGraphemes,
  createMessage,
  createModeration,
  messageId,
  messageProblem,
  verifiedModeration,
} from './board-messages.cjs'

// SLJ-149: a board's messages and moderation list, signed and checked the
// same way on every device.
// A board is named by the course's code (a hash of its drive's manifest);
// its moderation list is signed by the course's own key.
const course = crypto.keyPair()
const teacherKey = course.publicKey
const boardKey = crypto.randomBytes(32)
const student = crypto.keyPair()
const now = 1_800_000_000_000

describe('board messages', () => {
  it('signs a message that another device accepts', () => {
    const message = createMessage({ boardKey, date: now, keyPair: student, name: 'Ana', text: 'Hello 👋' })
    expect(messageProblem(boardKey, message, { now })).toBeNull()
    expect(messageId(message)).toMatch(/^[0-9a-f]{32}$/)
  })

  it('counts characters as people see them', () => {
    expect(countGraphemes('👍🏽é')).toBe(2)
    const thumbs = '👍🏽'.repeat(256)
    // 256 characters, but 2 KB: too large.
    expect(() => createMessage({ boardKey, keyPair: student, text: thumbs })).toThrow(/too-long/)
    expect(() => createMessage({ boardKey, keyPair: student, text: 'a'.repeat(256) })).not.toThrow()
    expect(() => createMessage({ boardKey, keyPair: student, text: 'a'.repeat(257) })).toThrow(/too-long/)
    expect(() => createMessage({ boardKey, keyPair: student, text: '   ' })).toThrow(/empty/)
  })

  it('refuses a changed message, one for another board, and one from the future', () => {
    const message = createMessage({ boardKey, date: now, keyPair: student, name: 'Ana', text: 'Hi' })
    expect(messageProblem(boardKey, { ...message, text: 'Bye' }, { now })).toBe('signature')
    expect(messageProblem(boardKey, { ...message, name: 'Teacher' }, { now })).toBe('signature')
    expect(messageProblem(crypto.keyPair().publicKey, message, { now })).toBe('signature')
    expect(messageProblem(boardKey, message, { now: now - MAX_CLOCK_AHEAD_MS - 1 })).toBe('future')
    expect(messageProblem(boardKey, { ...message, v: 2 }, { now })).toBe('invalid')
    expect(messageProblem(boardKey, null, { now })).toBe('invalid')
  })
})

describe('moderation list', () => {
  const list = { blocked: [student.publicKey.toString('hex')], hidden: ['ab'.repeat(16)], on: true, seq: 5 }

  it("accepts only a list signed by the course's key", () => {
    const signed = createModeration({ boardKey, keyPair: course, list, teacherKey })
    expect(verifiedModeration(boardKey, teacherKey, signed)).toMatchObject({ on: true, seq: 5 })
    expect(verifiedModeration(boardKey, teacherKey, { ...signed, on: false })).toBeNull()
    expect(verifiedModeration(crypto.randomBytes(32), teacherKey, signed)).toBeNull()
    expect(verifiedModeration(boardKey, teacherKey, { ...signed, hidden: [] })).toBeNull()
    expect(() => createModeration({ boardKey, keyPair: student, list, teacherKey })).toThrow(/course's own key/)
  })

  it('keeps the students limit within bounds', () => {
    expect(() => createModeration({ boardKey, keyPair: course, list: { ...list, studentLimitBytes: 10 }, teacherKey })).toThrow(/limit/)
  })
})
