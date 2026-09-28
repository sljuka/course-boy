// A course id is opaque and random: 16 characters of lowercase base32
// (RFC 4648 alphabet: a–z, 2–7), i.e. 80 random bits. It is the course's
// folder name under `courses/`, the namespace its share drive key is derived
// from, and part of `matko-asset://` URLs — so it must never change after
// creation and never collide, including across different teachers' courses on
// one student's machine. The title lives only in course.json and can change
// freely. See docs/contracts.md §5.
//
// Ids arrive from untrusted places (an imported course.json, the renderer over
// IPC) and become directory names, so every entry point checks
// `isValidCourseId` before touching the filesystem. The Bare worker can't
// import this TypeScript module; `workers/course-id.cjs` mirrors the pattern
// and a test keeps the two in agreement.

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

export const COURSE_ID_LENGTH = 16;

export const COURSE_ID_PATTERN = /^[a-z2-7]{16}$/;

export function isValidCourseId(value: unknown): value is string {
  return typeof value === "string" && COURSE_ID_PATTERN.test(value);
}

// 10 random bytes = 80 bits = exactly 16 base32 characters.
export function createCourseId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let bits = 0;
  let bitCount = 0;
  let id = "";

  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;

    while (bitCount >= 5) {
      bitCount -= 5;
      id += BASE32_ALPHABET[(bits >> bitCount) & 31];
    }
  }

  return id;
}
