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
// And a program's code alone (SLJ-194): the seeder keeps the courses the
// program lists, also one added to it later, and drops them with it.
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
  programStudent: 'program-student',
  student: 'student',
  teacher: 'teacher',
})

const CLI = path.join(import.meta.dirname, '..', 'seeder', 'cli.mjs')
const SEEDER_DATA = path.join(ROOT, 'seeder')
const IMAGE = process.env.MATKO_SEEDER_IMAGE || null
const CONTAINER = 'matko-seeder-e2e'
// The program scenario's seeder serves its web page here (SLJ-194).
const WEB_PORT = 18_391

// How to run a seeder command: `node seeder/cli.mjs`, or the image's.
// `env`: extra settings for the seeder (passed into the container too).
function seederCommand(args, { container = CONTAINER, dataDir = SEEDER_DATA, env = {}, inRunning = false } = {}) {
  if (!IMAGE) return ['node', [CLI, ...args, '--data', dataDir]]
  if (inRunning) return ['docker', ['exec', container, 'node', 'seeder/cli.mjs', ...args]]
  // Made before Docker mounts it: a mount point Docker has to create itself
  // belongs to root on Linux, and the seeder runs as this user.
  fs.mkdirSync(dataDir, { recursive: true })
  // Owned by whoever runs the test, so the mounted folder stays theirs.
  const user = typeof process.getuid === 'function' ? ['--user', `${process.getuid()}:${process.getgid()}`] : []
  return [
    'docker',
    [
      'run', '--rm', '--network', 'host', ...user, '-v', `${dataDir}:/data`, '-e', `MATKO_DHT_BOOTSTRAP=${bootstrap()}`,
      ...Object.entries(env).flatMap(([name, value]) => ['-e', `${name}=${value}`]),
      ...(args[0] === 'run' ? ['--name', container] : []), IMAGE, ...args,
    ],
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

  // SLJ-194: a seeder whose disk has too little left (here a floor no disk
  // meets) doesn't start keeping a new code: it waits for space.
  it('without space, a new code waits instead of being fetched', async () => {
    const dataDir = path.join(ROOT, 'seeder-full')
    const env = { MATKO_SEED_MIN_FREE: '1000TB' }
    const container = `${CONTAINER}-full`
    const [addCommand, addArgs] = seederCommand(['add', code], { container, dataDir, env })
    execFileSync(addCommand, addArgs, { env: { ...process.env, ...env } })
    const [command, commandArgs] = seederCommand(['run'], { container, dataDir, env })
    const full = spawn(command, commandArgs, { env: { ...process.env, ...env, MATKO_DHT_BOOTSTRAP: bootstrap() } })
    const log = []
    full.stdout.on('data', (chunk) => log.push(chunk.toString()))
    onTestFailed(() => console.log(`full seeder log:\n${log.join('')}`))
    try {
      await expect
        .poll(
          () => {
            try {
              return JSON.parse(fs.readFileSync(path.join(dataDir, 'status.json'), 'utf8'))
            } catch {
              return null
            }
          },
          { interval: 250, timeout: 30_000 },
        )
        .toMatchObject({ kept: [], space: { full: 'disk' }, waiting: [code] })
      expect(log.join('')).toMatch(/the disk is nearly full: new codes wait/)
    } finally {
      full.kill('SIGTERM')
      await new Promise((resolve) => full.once('exit', resolve))
      if (IMAGE) spawnSync('docker', ['rm', '-f', container])
    }
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

describe('a program on the seeder keeps the courses it lists (SLJ-194)', () => {
  const dataDir = path.join(ROOT, 'seeder-program')
  const container = `${CONTAINER}-program`
  let seeder = null
  const seederLog = []
  let teacher
  let first
  let second
  let programId
  let programCode

  const cli = (...args) => {
    const [command, commandArgs] = seederCommand(args, { container, dataDir, inRunning: Boolean(IMAGE && seeder && seeder.exitCode === null) })
    return execFileSync(command, commandArgs, { encoding: 'utf8', env: { ...process.env, MATKO_DHT_BOOTSTRAP: bootstrap() } }).trim()
  }
  const status = () => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dataDir, 'status.json'), 'utf8')).kept
    } catch {
      return []
    }
  }
  const keptFor = (code) => status().find((entry) => entry.driveKey === code) ?? null
  const web = `http://127.0.0.1:${WEB_PORT}`
  const webChange = (action, code, headers = {}) =>
    fetch(`${web}/api/${action}`, {
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json', 'X-Matko-Seeder': '1', ...headers },
      method: 'POST',
    })
  const dumpSeederLog = () => onTestFailed(() => console.log(`seeder log:\n${seederLog.join('')}`))

  async function publishCourse(page, title) {
    const ids = await page.evaluate(async (title) => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    }, title)
    await writeLesson(page, ids, `${title} lesson.`)
    const version = await cutAndPublish(page, ids.courseId)
    const code = IdEncoding.normalize((await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')).code)
    return { code, courseId: ids.courseId, title, version }
  }

  // Puts the courses on the program and publishes it; its code never changes.
  async function publishProgram(page, courses) {
    const entries = courses.map((course) => ({
      code: course.code,
      courseId: course.courseId,
      snapshot: { locales: { en: { description: '', title: course.title } }, publisherId: null, supportedLocales: ['en'], version: course.version },
    }))
    await page.evaluate(async ({ entries, id }) => {
      const program = await window.programs.get(id)
      await window.programs.update({ ...program, courses: entries })
    }, { entries, id: programId })
    const { code } = await page.evaluate((id) => window.programs.publish(id), programId)
    return IdEncoding.normalize(code)
  }

  afterAll(async () => {
    if (seeder && seeder.exitCode === null) {
      seeder.kill('SIGKILL')
      await new Promise((resolve) => seeder.once('exit', resolve))
    }
    if (IMAGE) spawnSync('docker', ['rm', '-f', container])
  })

  it("keeps the program and the course on it, from the program's code alone", async () => {
    dumpSeederLog()
    teacher = await launch('teacher', { fresh: false })
    await unlockIdentity(teacher)
    first = await publishCourse(teacher, 'E2E Program Seeded One')
    programId = (await teacher.evaluate(() => window.programs.create({ locale: 'en', title: 'E2E Seeded Program' }))).programId
    programCode = await publishProgram(teacher, [first])

    // With its web page (SLJ-194): the program is added there, not with `add`.
    const [command, commandArgs] = seederCommand(['run', '--web', String(WEB_PORT)], { container, dataDir })
    seeder = spawn(command, commandArgs, { env: { ...process.env, MATKO_DHT_BOOTSTRAP: bootstrap() } })
    seeder.stdout.on('data', (chunk) => seederLog.push(chunk.toString()))
    seeder.stderr.on('data', (chunk) => seederLog.push(chunk.toString()))
    await expect.poll(() => seederLog.join(''), { interval: 250, timeout: 30_000 }).toContain(`web page on http://127.0.0.1:${WEB_PORT}/`)
    expect(await (await fetch(`${web}/`)).text()).toContain('Matko seeder')
    expect(await (await webChange('add', `matko://import/${programCode}`)).json()).toEqual({ changed: true, code: programCode })

    await expect.poll(() => keptFor(programCode)?.state, { interval: 250, timeout: 60_000 }).toBe('kept')
    await expect.poll(() => keptFor(first.code)?.state, { interval: 250, timeout: 60_000 }).toBe('kept')
    expect(keptFor(first.code)).toMatchObject({ kind: 'course', title: 'E2E Program Seeded One', via: programCode })
    expect(keptFor(programCode)).toMatchObject({ kind: 'program', listed: [first.code], via: null })
    // On the list: only the program.
    expect(cli('list').split('\n')).toHaveLength(1)
    expect(cli('status')).toMatch(/E2E Seeded Program \(program\)[\s\S]*└ .*E2E Program Seeded One \(course\)  kept/)
    // The page's state: the program on the list, its course kept for it.
    const state = await (await fetch(`${web}/api/state`)).json()
    expect(state.added.map((entry) => entry.code)).toEqual([programCode])
    expect(state.kept.find((entry) => entry.driveKey === first.code)).toMatchObject({ state: 'kept', via: programCode })
    expect(state.recent.map((entry) => entry.line).join('\n')).toContain(`listed by ${programCode.slice(0, 8)}`)
  })

  it('a course added to the program later is kept too', async () => {
    dumpSeederLog()
    second = await publishCourse(teacher, 'E2E Program Seeded Two')
    expect(await publishProgram(teacher, [first, second])).toBe(programCode)
    await expect.poll(() => keptFor(second.code)?.state, { interval: 250, timeout: 90_000 }).toBe('kept')
    expect(keptFor(second.code)).toMatchObject({ via: programCode })
  })

  it('with the teacher closed, a new student imports that course from the seeder alone', async () => {
    dumpSeederLog()
    await close('teacher')
    const student = await launch('programStudent')
    expect(await importCourse(student, second.code)).toEqual({ courseId: second.courseId })
    await close('programStudent')
  })

  it("removing the program drops its courses too, and SIGTERM stops the seeder", async () => {
    dumpSeederLog()
    // Another site can't remove it; the page can.
    expect((await webChange('remove', programCode, { Origin: 'https://example.com' })).status).toBe(403)
    expect(await (await webChange('remove', programCode)).json()).toEqual({ changed: true, code: programCode })
    await expect.poll(() => status().length, { interval: 250, timeout: 20_000 }).toBe(0)
    seeder.kill('SIGTERM')
    await expect.poll(() => seeder.exitCode, { timeout: 15_000 }).toBe(0)
  })
})
