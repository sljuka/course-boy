import { describe, expect, it } from 'vitest'
import { isValidCourseId, MAX_COURSE_ID_LENGTH } from './course-id.cjs'

describe('isValidCourseId', () => {
  it('accepts ids in the shape slugifyCourseName produces', () => {
    expect(isValidCourseId('polinomi')).toBe(true)
    expect(isValidCourseId('matko-getting-started')).toBe(true)
    expect(isValidCourseId('everyday-math-2')).toBe(true)
  })

  it('rejects path traversal and separators', () => {
    expect(isValidCourseId('..')).toBe(false)
    expect(isValidCourseId('../../Library/evil')).toBe(false)
    expect(isValidCourseId('a/b')).toBe(false)
    expect(isValidCourseId('a\\b')).toBe(false)
    expect(isValidCourseId('/abs')).toBe(false)
  })

  it('rejects anything outside lowercase dash-separated ascii', () => {
    expect(isValidCourseId('')).toBe(false)
    expect(isValidCourseId('Polinomi')).toBe(false)
    expect(isValidCourseId('-leading')).toBe(false)
    expect(isValidCourseId('trailing-')).toBe(false)
    expect(isValidCourseId('double--dash')).toBe(false)
    expect(isValidCourseId('has space')).toBe(false)
    expect(isValidCourseId('.hidden')).toBe(false)
  })

  it('rejects non-strings and overlong ids', () => {
    expect(isValidCourseId(undefined)).toBe(false)
    expect(isValidCourseId(42)).toBe(false)
    expect(isValidCourseId({ toString: () => 'polinomi' })).toBe(false)
    expect(isValidCourseId('a'.repeat(MAX_COURSE_ID_LENGTH))).toBe(true)
    expect(isValidCourseId('a'.repeat(MAX_COURSE_ID_LENGTH + 1))).toBe(false)
  })
})
