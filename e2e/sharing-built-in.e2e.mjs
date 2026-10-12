// SLJ-115: the built-in course as a published course. A teacher (standing in
// for the project's maintainer) adopts it with scripts/built-in-course.mjs,
// publishes it, and snapshots it into a stand-in for the repo's courses/; a
// student whose app ships that snapshot gets it as a followed course, and
// gets the teacher's next version like any imported course's.

import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { APP_DIR, waitFor } from './launch.mjs'
import { cutAndPublish, finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, waitForUpdate, writeLesson } from './sharing-suite.mjs'

const BUILT_IN_ID = 'thys2vej6my5mpxt'

const { ROOT, apps, close, data, launch } = sharingSuite('built-in', {
  student: 'student',
  teacher: 'teacher',
})

// What the app ships, as the repo would hold it after `snapshot`.
const shipped = () => path.join(ROOT, 'shipped')

function runScript(command, profileDir) {
  return execFileSync(process.execPath, [path.join(APP_DIR, 'scripts', 'built-in-course.mjs'), command, profileDir], {
    encoding: 'utf8',
    env: { ...process.env, MATKO_BUNDLED_COURSES_DIR: shipped() },
  })
}

const listBuiltIn = (page) =>
  page.evaluate(async (id) => (await window.courses.list('en')).find((course) => course.id === id), BUILT_IN_ID)

describe('the built-in course, published', () => {
  let code

  it('the maintainer adopts the shipped course, publishes it and snapshots it', async () => {
    let teacher = await launch('teacher')
    await finishOnboarding(teacher, 'teacher')
    await setUpIdentity(teacher)
    await close('teacher')

    // The repo's courses/, with this teacher as the project's identity.
    const { publisherId } = JSON.parse(fs.readFileSync(path.join(data.teacher, 'publisher-identity.matko-identity'), 'utf8'))
    fs.cpSync(path.join(APP_DIR, 'courses'), shipped(), { recursive: true })
    fs.writeFileSync(
      path.join(shipped(), 'bundled.json'),
      JSON.stringify({ courses: [{ code: null, courseId: BUILT_IN_ID, publisherId }] }),
    )
    expect(runScript('adopt', data.teacher)).toContain('is now this profile')

    teacher = await launch('teacher', { fresh: false, extraEnv: { MATKO_BUNDLED_COURSES_DIR: shipped() } })
    await teacher.evaluate((password) => window.sharing.unlockIdentity(password), 'correct horse battery')
    expect(await listBuiltIn(teacher)).toMatchObject({ distribution: 'local', isBuiltIn: false })
    // The name its students see next to the Publisher ID.
    await teacher.evaluate(() => window.preferences.set({ publisherName: 'E2E Project' }))
    await cutAndPublish(teacher, BUILT_IN_ID)
    ;({ code } = await waitForSharing(teacher, BUILT_IN_ID, (info) => info.status === 'shared'))

    expect(runScript('snapshot', data.teacher)).toContain(code)
    const config = JSON.parse(fs.readFileSync(path.join(shipped(), 'bundled.json'), 'utf8'))
    expect(config.courses[0]).toMatchObject({ code, courseId: BUILT_IN_ID, publisherId })
    expect(JSON.parse(fs.readFileSync(path.join(shipped(), BUILT_IN_ID, 'source.json'), 'utf8'))).toMatchObject({
      driveKey: code,
      publisher: { id: publisherId, name: 'E2E Project' },
    })
  })

  it('a student with the copy from before gets it as a followed course, progress kept', async () => {
    // An app from before: the course at its root, with a lesson done.
    let student = await launch('student')
    await finishOnboarding(student, 'student')
    expect(await listBuiltIn(student)).toMatchObject({ distribution: 'bundled', isBuiltIn: true })
    const lessonId = await student.evaluate(async (id) => {
      const details = await window.courses.get(id, 'en')
      return details.sections[0].lessons[0].id
    }, BUILT_IN_ID)
    await student.evaluate(({ courseId, lessonId }) => window.progress.recordStepDone({ courseId, stepId: lessonId }), {
      courseId: BUILT_IN_ID,
      lessonId,
    })
    await close('student')

    // The new app, shipping the published snapshot.
    student = await launch('student', { fresh: false, extraEnv: { MATKO_BUNDLED_COURSES_DIR: shipped() } })
    expect(await listBuiltIn(student)).toMatchObject({ distribution: 'imported', isBuiltIn: true })
    expect(fs.readdirSync(path.join(data.student, 'courses', BUILT_IN_ID)).sort()).toEqual(['release.json', 'versions'])
    const info = await waitForSharing(student, BUILT_IN_ID, (info) => info.code === code)
    expect(info.update).toBeNull()
    const progress = await student.evaluate(() => window.progress.get())
    expect(progress.courses[BUILT_IN_ID].steps[lessonId]).toBeTruthy()

    // Who published it: the name it carries, with the Publisher ID.
    const publishers = await student.evaluate(() => window.publishers.list('en'))
    expect(publishers.map((entry) => entry.claimedName)).toEqual(['E2E Project'])
    await waitFor(student, () => /E2E Project \([a-z0-9]{8}…\)/.test(document.querySelector('[data-testid="course-publisher"]')?.textContent ?? ''), {
      timeout: 30_000,
    })
  })

  it("gets the maintainer's next version like any imported course's", async () => {
    const teacher = apps.teacher.page
    const ids = await teacher.evaluate(async (id) => {
      const details = await window.courses.get(id, 'en')
      const section = details.sections[0]
      return { courseId: id, lessonId: section.lessons[0].id, sectionId: section.id }
    }, BUILT_IN_ID)
    await writeLesson(teacher, ids, 'Something new in Getting Started.')
    const version = await cutAndPublish(teacher, BUILT_IN_ID)

    const student = apps.student.page
    await waitForUpdate(student, BUILT_IN_ID, (update) => update.version === version, 60_000)
    await expect(student.evaluate((id) => window.sharing.applyCourseUpdate(id), BUILT_IN_ID)).resolves.toMatchObject({ version })
    expect(await listBuiltIn(student)).toMatchObject({ distribution: 'imported', isBuiltIn: true, version })
  })
})
