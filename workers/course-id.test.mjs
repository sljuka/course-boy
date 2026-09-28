import { describe, expect, it } from 'vitest'
import { isValidCourseId } from './course-id.cjs'
import { createCourseId, isValidCourseId as isValidCourseIdInApp } from '../src/lib/course-id'

const samples = [
  'abcdefghijklmn23',
  'polinomi',
  'matko-getting-started',
  '..',
  '../../Library/evil',
  'a/b',
  'a\\b',
  '',
  'AAAAAAAAAAAAAAAA',
  'aaaaaaaaaaaaaaa1',
  'aaaaaaaaaaaaaaaaa',
  undefined,
  42,
]

describe('isValidCourseId (worker)', () => {
  it('accepts ids the app creates', () => {
    for (let index = 0; index < 20; index += 1) {
      expect(isValidCourseId(createCourseId())).toBe(true)
    }
  })

  it('rejects path traversal, separators and legacy slug ids', () => {
    expect(isValidCourseId('../../Library/evil')).toBe(false)
    expect(isValidCourseId('a/b')).toBe(false)
    expect(isValidCourseId('polinomi')).toBe(false)
    expect(isValidCourseId({ toString: () => 'abcdefghijklmn23' })).toBe(false)
  })

  it('agrees with the app-side validator on every sample', () => {
    for (const sample of samples) {
      expect(isValidCourseId(sample)).toBe(isValidCourseIdInApp(sample))
    }
  })
})
