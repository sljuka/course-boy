// SLJ-144: the headless seeder (seeder/cli.mjs) keeps a course online while
// its teacher's app is closed. A real seeder process (Node, the app's own
// worker, no Electron) next to real app instances, on this file's own local
// testnet.
//
//   teacher publishes → `add` the code, `run` the seeder → it keeps the course
//   teacher quits → a new student imports, from the seeder alone
//   student quits; teacher publishes again → the seeder fetches it on its own
//   teacher quits; the student starts → offered the new version, applies it
//   `remove` → a running seeder stops keeping it; SIGTERM → it stops
//
// With MATKO_SEEDER_IMAGE set (e.g. `matko-seeder:dev`, built from
// seeder/Dockerfile), the same scenario runs against that Docker image
// instead (SLJ-194): `run` is a container on the host's network, the other
// commands run in it (or in a throwaway one while it isn't running), and the
// data folder is mounted at /data. Host networking needs Linux, or Docker
// Desktop with host networking turned on.

import { afterAll, describe, expect, it, onTestFailed } from 'vitest'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import IdEncoding from 'hypercore-id-encoding'
import { currentVersionFiles, cutAndPublish, importCourse, setUpIdentity, sharingSuite, unlockIdentity, waitForSharing, waitForUpdate, writeLesson } from './sharing-suite.mjs'

const { ROOT, bootstrap, close, data, launch } = sharingSuite('seeder', {
  student: 'student',
  teacher: 'teacher',
})

const CLI = path.join(import.meta.dirname, '..', 'seeder', 'cli.mjs')
const SEEDER_DATA = path.join(ROOT, 'seeder')
const IMAGE = process.env.MATKO_SEEDER_IMAGE || null
const CONTAINER = 'matko-seeder-e2e'

// How to run a seeder command: `node seeder/cli.mjs`, or the image's.
function seederCommand(args, { inRunning = false } = {}) {
  if (!IMAGE) return ['node', [CLI, ...args, '--data', SEEDER_DATA]]
  if (inRunning) return ['docker', ['exec', CONTAINER, 'node', 'seeder/cli.mjs', ...args]]
  // Owned by whoever runs the test, so the mounted folder stays theirs.
  const user = typeof process.getuid === 'function' ? ['--user', `${process.getuid()}:${process.getgid()}`] : []
  return [
    'docker',
    ['run', '--rm', '--network', 'host', ...user, '-v', `${SEEDER_DATA}:/data`, '-e', `MATKO_DHT_BOOTSTRAP=${bootstrap()}`, ...(args[0] === 'run' ? ['--name', CONTAINER] : []), IMAGE, ...args],
  ]
}

describe('the headless seeder (SLJ-144)', () => {
  let seeder = null
  const seederLog = []
  let ids
  let code
  let firstVersion
  let secondVersion

  // A command runs in the container while the seeder runs there: a second
  // container would have a process namespace of its own.
  const cli = (...args) => {
    const [command, commandArgs] = seederCommand(args, { inRunning: Boolean(IMAGE && seeder && seeder.exitCode === null) })
    return execFileSync(command, commandArgs, {
      encoding: 'utf8',
      env: { ...process.env, MATKO_DHT_BOOTSTRAP: bootstrap() },
    }).trim()
  }

  // What the running seeder reports for the course, once `predicate` holds.
  async function waitForSeeder(predicate, timeout = 60_000) {
    let entry = null
    await expect
      .poll(
        () => {
          try {
            const status = JSON.parse(fs.readFileSync(path.join(SEEDER_DATA, 'status.json'), 'utf8'))
            entry = status.kept.find((kept) => kept.driveKey === code) ?? null
            return Boolean(entry && predicate(entry, status))
          } catch {
            return false
          }
        },
        { interval: 250, timeout },
      )
      .toBe(true)
    return entry
  }

  // The seeder's own log, when a test fails: it isn't a window, so
  // e2e/failures.mjs can't record it.
  const dumpSeederLog = () => onTestFailed(() => console.log(`seeder log:\n${seederLog.join('')}`))

  afterAll(async () => {
    if (seeder && seeder.exitCode === null) {
      seeder.kill('SIGKILL')
      await new Promise((resolve) => seeder.once('exit', resolve))
    }
    // Killing `docker run` leaves its container running.
    if (IMAGE) spawnSync('docker', ['rm', '-f', CONTAINER])
  })

  it('a teacher publishes, and the seeder keeps the course once its code is added', async () => {
    dumpSeederLog()
    const teacher = await launch('teacher')
    await setUpIdentity(teacher)
    ids = await teacher.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Seeded Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(teacher, ids, 'First version, kept by the seeder.')
    firstVersion = await cutAndPublish(teacher, ids.courseId)
    code = IdEncoding.normalize((await waitForSharing(teacher, ids.courseId, (info) => info.status === 'shared')).code)

    // A share link is taken as well as a code; added before the seeder runs.
    expect(cli('add', `matko://import/${code}`)).toMatch(/^Added /)
    expect(cli('status')).toMatch(/Not running[\s\S]*waiting to start/)

    const [command, commandArgs] = seederCommand(['run'])
    seeder = spawn(command, commandArgs, {
      env: { ...process.env, MATKO_DHT_BOOTSTRAP: bootstrap() },
    })
    seeder.stdout.on('data', (chunk) => seederLog.push(chunk.toString()))
    seeder.stderr.on('data', (chunk) => seederLog.push(chunk.toString()))

    const kept = await waitForSeeder((entry) => entry.state === 'kept')
    expect(kept).toMatchObject({ id: ids.courseId, kind: 'course', title: 'E2E Seeded Course', version: firstVersion })
    // In a container the seeder is its first process.
    expect(cli('status')).toMatch(new RegExp(`^Running \\(pid ${IMAGE ? 1 : seeder.pid}\\)[\\s\\S]*E2E Seeded Course \\(course\\)  kept ${firstVersion.replace('.', '\\.')}`))

    // One seeder per folder: a second run is refused, the first keeps running.
    expect(() => cli('run')).toThrow(/already running/)
    expect(seeder.exitCode).toBeNull()
  })

  it('with the teacher closed, a new student imports the course from the seeder alone', async () => {
    dumpSeederLog()
    await close('teacher')
    const student = await launch('student')
    expect(await importCourse(student, code)).toEqual({ courseId: ids.courseId })
    const courses = await student.evaluate(() => window.courses.list('en'))
    expect(courses.find((course) => course.id === ids.courseId)?.version).toBe(firstVersion)
    await close('student')
  })

  it("the seeder fetches the teacher's next version on its own", async () => {
    dumpSeederLog()
    const teacher = await launch('teacher', { fresh: false })
    await unlockIdentity(teacher)
    await writeLesson(teacher, ids, 'Second version, fetched by the seeder.')
    secondVersion = await cutAndPublish(teacher, ids.courseId)
    await waitForSharing(teacher, ids.courseId, (info) => info.status === 'shared')

    await waitForSeeder((entry) => entry.state === 'kept' && entry.version === secondVersion, 90_000)
    expect(seederLog.join('')).toContain(`kept course "E2E Seeded Course" ${secondVersion}`)
  })

  it('with the teacher closed again, the student is offered that version at their next start and applies it from the seeder', async () => {
    dumpSeederLog()
    await close('teacher')
    const student = await launch('student', { fresh: false })
    await waitForUpdate(student, ids.courseId, (update) => update.version === secondVersion, 60_000)
    await expect(student.evaluate((id) => window.sharing.applyCourseUpdate(id), ids.courseId)).resolves.toEqual({
      version: secondVersion,
    })
    const lessons = currentVersionFiles(data.student, ids.courseId).filter(({ file }) => file.endsWith('.md'))
    expect(lessons.map(({ path: file }) => fs.readFileSync(file, 'utf8')).join('\n')).toContain('Second version, fetched by the seeder.')
    await close('student')
  })

  it('remove reaches the running seeder, and SIGTERM stops it cleanly', async () => {
    dumpSeederLog()
    expect(cli('remove', code)).toMatch(/^Removed /)
    await expect
      .poll(() => seederLog.join(''), { interval: 250, timeout: 20_000 })
      .toContain('stopped keeping')
    await expect
      .poll(() => JSON.parse(fs.readFileSync(path.join(SEEDER_DATA, 'status.json'), 'utf8')).kept.length, { timeout: 20_000 })
      .toBe(0)

    seeder.kill('SIGTERM')
    await expect.poll(() => seeder.exitCode, { timeout: 15_000 }).toBe(0)
    expect(cli('status')).toMatch(/^Not running/)
    expect(fs.existsSync(path.join(SEEDER_DATA, 'seeder.pid'))).toBe(false)
  })
})
