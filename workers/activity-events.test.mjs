import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'hypercore-crypto'
import { activityEventProblem, createActivityEvent, dayOf, openActivityEvent } from './activity-events.cjs'
import { MAX_AGE_DAYS, openActivityRelay, openActivityTotals } from './activity-store.cjs'
import { createModeration, verifiedModeration } from './board-messages.cjs'

// SLJ-168: a student's activity events, sealed for the course's key and
// signed by a key of their own; the teacher's device opens and counts them.
const course = crypto.keyPair()
const teacherKey = course.publicKey
const boardKey = crypto.randomBytes(32)
const now = 1_800_000_000_000
const today = dayOf(now)

function event(payload, { day = today, keyPair = crypto.keyPair() } = {}) {
  return createActivityEvent({ boardKey, day, keyPair, payload, teacherKey })
}

describe('activity events', () => {
  it('can be checked by anyone, and read only with the course key', () => {
    const finished = event({ attempt: 2, kind: 'finished', version: '1.2.0' })
    expect(activityEventProblem(boardKey, finished, { now })).toBeNull()
    expect(JSON.stringify(finished)).not.toContain('finished')
    expect(openActivityEvent(finished, course)).toEqual({ attempt: 2, kind: 'finished', version: '1.2.0' })
    expect(openActivityEvent(finished, crypto.keyPair())).toBeNull()
  })

  it('refuses changed events, other boards, the future, and payloads that are not events', () => {
    const started = event({ kind: 'started' })
    expect(activityEventProblem(crypto.randomBytes(32), started, { now })).toBe('signature')
    expect(activityEventProblem(boardKey, { ...started, day: today - 1 }, { now })).toBe('signature')
    expect(activityEventProblem(boardKey, event({ kind: 'started' }, { day: today + 2 }), { now })).toBe('future')
    expect(activityEventProblem(boardKey, { ...started, box: 'x'.repeat(1000) }, { now })).toBe('invalid')

    expect(() => event({ kind: 'started', attempt: 1 })).toThrow()
    expect(() => event({ attempt: 6, kind: 'finished' })).toThrow()
    expect(() => event({ attempt: 1, kind: 'section' })).toThrow()
    expect(() => event({ attempt: 1, band: '10%', kind: 'end' })).toThrow()
    expect(openActivityEvent(event({ attempt: 1, band: '75-99', kind: 'end' }), course)).toEqual({
      attempt: 1,
      band: '75-99',
      kind: 'end',
    })
  })

  it('the moderation list says whether the course collects activity, signed', () => {
    const list = createModeration({ boardKey, keyPair: course, list: { activity: false, on: true, seq: 1 }, teacherKey })
    expect(verifiedModeration(boardKey, teacherKey, list)).toMatchObject({ activity: false, v: 2 })
    expect(verifiedModeration(boardKey, teacherKey, { ...list, activity: true })).toBeNull()
  })
})

describe('activity store', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-activity-'))

  it('passes events on until they are too old, once per key', async () => {
    const folder = path.join(root, 'relay')
    const relay = await openActivityRelay({ boardKey, folder, fs: fsp, now: () => now })
    const keyPair = crypto.keyPair()
    expect(relay.add(event({ kind: 'imported' }, { keyPair }))).toBe('added')
    expect(relay.add(event({ kind: 'started' }, { keyPair }))).toBe('duplicate')
    expect(relay.add(event({ kind: 'started' }, { day: today - MAX_AGE_DAYS - 1 }))).toBe('too-old')
    await relay.flush()

    const again = await openActivityRelay({ boardKey, folder, fs: fsp, now: () => now })
    expect(again.size).toBe(1)
    const later = await openActivityRelay({ boardKey, folder, fs: fsp, now: () => now + (MAX_AGE_DAYS + 2) * 86_400_000 })
    expect(later.size).toBe(0)
    await later.flush()
  })

  it("counts each key once and keeps the teacher's totals under the course id", async () => {
    const folder = path.join(root, 'teacher')
    const totals = await openActivityTotals({ courseId: 'fractions', folder, fs: fsp })
    const first = event({ attempt: 1, kind: 'finished' })
    expect(totals.count(first.key, first.day, openActivityEvent(first, course))).toBe(true)
    expect(totals.count(first.key, first.day, openActivityEvent(first, course))).toBe(false)
    const section = event({ attempt: 1, kind: 'section', section: 'basics' })
    totals.count(section.key, section.day, openActivityEvent(section, course))
    await totals.flush()

    const again = await openActivityTotals({ courseId: 'fractions', folder, fs: fsp })
    expect(again.read()).toEqual({
      counted: 2,
      counts: { 'finished/1': 1, 'section/1/basics': 1 },
      days: { [today]: { 'finished/1': 1 } },
    })
    expect(again.hasCounted(first.key)).toBe(true)
    fs.rmSync(root, { force: true, recursive: true })
  })
})
