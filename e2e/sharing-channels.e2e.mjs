// SLJ-31: channels. A teacher's published course is shown on their channel
// (on by default at its first publish) and names the channel in its
// source.json; a student opens the channel from the course's page, sees the
// course there (which is what makes "by <channel>" true), follows it, and gets
// a course the teacher shows on it later.

import { describe, expect, it } from 'vitest'
import { waitFor, waitForText } from './launch.mjs'
import { cutAndPublish, finishOnboarding, importCourse, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { apps, launch } = sharingSuite('channels', {
  channelStudent: 'channel-student',
  channelTeacher: 'channel-teacher',
})

const CHANNEL_NAME = 'E2E Teacher Channel'

async function createCourse(page, title) {
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
  return ids
}

describe('channels', () => {
  let first
  let firstCode
  let channelCode
  let channelId

  it("a teacher's first published course is shown on their channel, which goes online", async () => {
    const teacher = await launch('channelTeacher')
    await finishOnboarding(teacher, 'teacher')
    await setUpIdentity(teacher)
    // As the identity setup does: the name the channel starts with.
    await teacher.evaluate((name) => window.preferences.set({ publisherName: name }), CHANNEL_NAME)

    first = await createCourse(teacher, 'E2E Channel Course One')
    await cutAndPublish(teacher, first.courseId)
    firstCode = (await waitForSharing(teacher, first.courseId, (info) => info.status === 'shared')).code

    // Listed by default, and the channel online with it; then the course is
    // online again, naming the channel.
    await expect
      .poll(() => teacher.evaluate((id) => window.channels.getForCourse(id), first.courseId), { interval: 500, timeout: 60_000 })
      .toMatchObject({ code: expect.any(String), listed: true, title: CHANNEL_NAME })
    channelCode = (await teacher.evaluate((id) => window.channels.getForCourse(id), first.courseId)).code
    await waitForSharing(teacher, first.courseId, (info) => info.status === 'shared', 60_000)

    // My channel shows it.
    await teacher.evaluate(() => {
      location.hash = '#/my-channel'
    })
    await teacher.locator('[data-testid="channel-course"]').first().waitFor({ timeout: 30_000 })
    expect(await teacher.locator('[data-testid="channel-course"]').count()).toBe(1)
  }, 180_000)

  it('a student opens the channel from the course and sees the course on it', async () => {
    const student = await launch('channelStudent')
    await finishOnboarding(student, 'student')
    expect(await importCourse(student, firstCode)).toEqual({ courseId: first.courseId })

    // The course names its channel; not checked until the channel is here.
    expect(await student.evaluate((id) => window.channels.getForCourse(id), first.courseId)).toEqual({
      code: channelCode,
      listed: null,
      programId: null,
      title: null,
      verified: false,
    })

    await student.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, first.courseId)
    await student.locator('[data-testid="open-course-channel"]').click({ timeout: 30_000 })
    await student.locator('[data-testid="channel-page"]').waitFor({ timeout: 60_000 })
    await waitForText(student, CHANNEL_NAME)
    channelId = await student.evaluate(() => location.hash.split('/').pop())
    expect(await student.locator('[data-testid="program-course"]').count()).toBe(1)

    // Back on the course: the channel lists it, so it links there.
    expect(await student.evaluate((id) => window.channels.getForCourse(id), first.courseId)).toMatchObject({
      programId: channelId,
      title: CHANNEL_NAME,
      verified: true,
    })
    await student.evaluate((id) => {
      location.hash = `#/courses/${id}`
    }, first.courseId)
    await student.locator('[data-testid="course-channel"]').waitFor({ timeout: 30_000 })

    // Followed: on Home, under Channels.
    await student.evaluate(() => {
      location.hash = '#/'
    })
    await waitFor(student, (name) => document.querySelector('[data-testid="home-group-channels"]')?.textContent?.includes(name), {
      arg: CHANNEL_NAME,
      timeout: 30_000,
    })
  }, 180_000)

  it('a course published without it, then shown on the channel, reaches the student', async () => {
    const teacher = apps.channelTeacher.page
    const second = await createCourse(teacher, 'E2E Channel Course Two')
    const { version } = await teacher.evaluate((courseId) => window.courses.cutVersion({ courseId, releaseType: 'minor' }), second.courseId)
    await teacher.evaluate((input) => window.courses.publishVersion(input), { courseId: second.courseId, showOnChannel: false, version })
    await waitForSharing(teacher, second.courseId, (info) => info.status === 'shared')
    expect(await teacher.evaluate((id) => window.channels.getForCourse(id), second.courseId)).toMatchObject({ listed: false })

    await teacher.evaluate((courseId) => window.channels.setCourseListed({ courseId, listed: true }), second.courseId)
    expect(await teacher.evaluate((id) => window.channels.getForCourse(id), second.courseId)).toMatchObject({ listed: true })

    // The student's copy of the channel follows its publisher: newest first.
    const student = apps.channelStudent.page
    await expect
      .poll(() => student.evaluate((id) => window.programs.get(id).then((channel) => channel.courses.map((course) => course.courseId)), channelId), {
        interval: 1_000,
        timeout: 90_000,
      })
      .toEqual([second.courseId, first.courseId])
  }, 180_000)
})
