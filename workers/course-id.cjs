// A course id becomes a directory name under `courses/`, and an imported course's
// id comes straight from a remote peer's course.json — so it is untrusted input
// that must be checked before it reaches any path operation. Mirrors the shape
// `slugifyCourseName` (src/lib/course-slug.ts) produces: lowercase ASCII letters
// and digits in dash-separated runs. That excludes `.`, `/` and `\`, so a valid id
// can never traverse out of `courses/`. Kept dependency-free CommonJS so both the
// Bare worker and vitest can load it.
const COURSE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_COURSE_ID_LENGTH = 200

function isValidCourseId(value) {
  return (
    typeof value === 'string' &&
    value.length <= MAX_COURSE_ID_LENGTH &&
    COURSE_ID_PATTERN.test(value)
  )
}

module.exports = { isValidCourseId, MAX_COURSE_ID_LENGTH }
