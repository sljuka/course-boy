// The built-in course (Getting Started) is a published course (SLJ-115): the
// maintainer edits and publishes it from a teacher profile signed in with the
// project's publishing identity, and the app ships a snapshot of the
// published version in courses/<id>/ with its code in courses/bundled.json.
//
//   node scripts/built-in-course.mjs adopt <profile folder>
//     Once: makes the shipped course that profile's own (courses/<id>/draft/),
//     to edit and publish. The app must be closed.
//
//   node scripts/built-in-course.mjs snapshot <profile folder>
//     After publishing it: copies the published version into courses/<id>/,
//     with the source.json its drive holds, and its code into bundled.json.
//     Then commit, and the next app release ships it.
//
// A profile folder is <data folder>/profiles/<name>-<16 chars>/ (on macOS the
// data folder is ~/Library/Application Support/matko).
//
// Never touches the identity file beyond reading its Publisher ID.
// MATKO_BUNDLED_COURSES_DIR (tests only) stands in for the repo's courses/.

import fs from 'node:fs'
import path from 'node:path'

const REPO_COURSES = process.env.MATKO_BUNDLED_COURSES_DIR ?? path.resolve(import.meta.dirname, '..', 'courses')
const CONFIG_PATH = path.join(REPO_COURSES, 'bundled.json')
// What a cut version holds on top of the draft (electron/course-paths.ts).
const VERSION_ONLY_FILES = new Set(['changelog.json', 'source.json', 'version-meta.json'])

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)

const [command, profileArg] = process.argv.slice(2)
if (!['adopt', 'snapshot'].includes(command) || !profileArg) {
  fail('usage: node scripts/built-in-course.mjs adopt|snapshot <profile folder>')
}

const profileDir = path.resolve(profileArg)
if (!fs.existsSync(path.join(profileDir, 'profile.json'))) fail(`${profileDir} is not a profile folder`)

const config = readJson(CONFIG_PATH)
const entry = config.courses?.[0]
if (!entry?.courseId || !entry.publisherId) fail(`${CONFIG_PATH} has no course`)
const courseId = entry.courseId
const courseRoot = path.join(profileDir, 'courses', courseId)

// The profile's publishing identity must be the project's.
const identityPath = path.join(profileDir, 'publisher-identity.matko-identity')
if (!fs.existsSync(identityPath)) fail('this profile has no publishing identity yet: set it up (or restore the project one) first')
const { publisherId } = readJson(identityPath)
if (publisherId !== entry.publisherId) {
  fail(`this profile publishes as ${publisherId}, not as the project (${entry.publisherId}, bundled.json)`)
}

if (command === 'adopt') {
  if (fs.existsSync(path.join(courseRoot, 'draft'))) fail(`${courseId} is already this profile's own course`)

  // The installed copy goes; the profile's progress through it is kept elsewhere.
  fs.rmSync(courseRoot, { force: true, recursive: true })
  const draftPath = path.join(courseRoot, 'draft')
  fs.cpSync(path.join(REPO_COURSES, courseId), draftPath, {
    filter: (source) => !VERSION_ONLY_FILES.has(path.relative(path.join(REPO_COURSES, courseId), source)),
    recursive: true,
  })
  const manifest = readJson(path.join(draftPath, 'course.json'))
  writeJson(path.join(draftPath, 'course.json'), { ...manifest, status: 'draft' })
  console.log(`✓ ${courseId} is now this profile's own course: open the app, edit it under My courses, and publish it.`)
} else {
  const { publishedVersion } = readJson(path.join(courseRoot, 'release.json'))
  if (!publishedVersion) fail(`${courseId} hasn't been published from this profile`)
  const published = readJson(path.join(profileDir, 'course-sharing.json')).published?.[courseId]
  if (!published?.code || !published.publicId) fail(`${courseId} hasn't been shared yet: open the app and let it go online first`)
  if (entry.code && entry.code !== published.code) fail(`bundled.json already has another code (${entry.code})`)

  const snapshotPath = path.join(REPO_COURSES, courseId)
  fs.rmSync(snapshotPath, { force: true, recursive: true })
  fs.cpSync(path.join(courseRoot, 'versions', publishedVersion), snapshotPath, { recursive: true })
  const manifest = readJson(path.join(snapshotPath, 'course.json'))
  writeJson(path.join(snapshotPath, 'course.json'), { ...manifest, status: 'published' })
  // As the drive holds it (writeSourceFile in workers/main.cjs), with the
  // profile's Publisher name if it has one.
  const preferencesPath = path.join(profileDir, 'config.json')
  const publisherName = fs.existsSync(preferencesPath) ? String(readJson(preferencesPath).publisherName ?? '').trim() : ''
  writeJson(path.join(snapshotPath, 'source.json'), {
    driveKey: published.code,
    publicId: published.publicId,
    publisher: { id: publisherId, ...(publisherName ? { name: publisherName } : {}) },
  })
  writeJson(CONFIG_PATH, { ...config, courses: [{ ...entry, code: published.code }, ...config.courses.slice(1)] })
  console.log(`✓ Version ${publishedVersion} of ${courseId} copied into courses/, code ${published.code} in bundled.json.`)
}
