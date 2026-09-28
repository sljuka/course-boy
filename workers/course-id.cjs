// A course id becomes a directory name under `courses/`, and an imported course's
// id comes straight from a remote peer's course.json — so it is untrusted input
// that must be checked before it reaches any path operation. Mirrors
// `COURSE_ID_PATTERN` in src/lib/course-id.ts (16 lowercase base32 characters);
// workers/course-id.test.mjs keeps the two in agreement. The alphabet has no
// `.`, `/` or `\`, so a valid id can never traverse out of `courses/`. Kept
// dependency-free CommonJS so both the Bare worker and vitest can load it.
const COURSE_ID_PATTERN = /^[a-z2-7]{16}$/

function isValidCourseId(value) {
  return typeof value === 'string' && COURSE_ID_PATTERN.test(value)
}

module.exports = { isValidCourseId }
