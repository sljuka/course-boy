import { describe, expect, it } from 'vitest'
import { wantedCodes } from './wanted.mjs'

const asObject = (wanted) => Object.fromEntries(wanted)

describe('wantedCodes', () => {
  it('keeps what is on the list', () => {
    expect(asObject(wantedCodes(['a', 'b'], []))).toEqual({ a: { via: null }, b: { via: null } })
  })

  it("also keeps a channel's courses and programs, and those programs' courses", () => {
    const kept = [
      { driveKey: 'channel', kind: 'channel', listed: ['course1', 'program'] },
      { driveKey: 'program', kind: 'program', listed: ['course2', 'course1'] },
      { driveKey: 'course1', kind: 'course', listed: [] },
    ]
    expect(asObject(wantedCodes(['channel'], kept))).toEqual({
      channel: { via: null },
      course1: { via: 'channel' },
      program: { via: 'channel' },
      course2: { via: 'program' },
    })
  })

  it('keeps a listed course as added when it is also on the list', () => {
    const kept = [{ driveKey: 'program', kind: 'program', listed: ['course'] }]
    expect(wantedCodes(['program', 'course'], kept).get('course')).toEqual({ via: null })
  })

  it('drops what a removed program listed, and a loop keeps nothing alive', () => {
    const kept = [
      { driveKey: 'p1', kind: 'program', listed: ['p2', 'course'] },
      { driveKey: 'p2', kind: 'program', listed: ['p1'] },
    ]
    expect([...wantedCodes(['p1'], kept).keys()].sort()).toEqual(['course', 'p1', 'p2'])
    expect([...wantedCodes([], kept).keys()]).toEqual([])
  })
})
