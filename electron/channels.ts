// Channels (SLJ-31): a publisher's home, which students open and follow.
//
// A channel is stored and shared as a program marked `kind: "channel"`
// (program-paths.ts, program-sharing.ts): its name, description, logo, banner
// and colors, and the courses its publisher chose to show on it, newest
// first. Phase 1: one channel per profile, run by this teacher alone.
//
// - Created the first time it's needed (`own`), named after the Publisher
//   name they gave, else their nickname.
// - A published course is listed when its teacher says so ("Show on my
//   channel": on by default at a course's first publish, off for courses
//   published before channels existed). `sync` rebuilds the list from that
//   and puts the channel online again when it changed.
// - A listed course's source.json names the channel (`channel.driveKey`):
//   `codeForCourse`. The channel listing the course back is what makes that
//   claim true; students check both (`describeForStudent`).
//
// No Electron dependency: unit-tested in channels.test.ts.

import type { ChannelForCourse } from '../src/lib/channels'
import type { ProgramCourse, ProgramManifest } from '../src/lib/program-package'

export type ChannelsDeps = {
  // The profile's own channel's program id, kept with the program sharing state.
  readOwnChannelId(): string | null
  writeOwnChannelId(programId: string): void
  // A new, empty channel with this title, in the profile's language.
  createChannel(title: string): Promise<string>
  readChannel(programId: string): Promise<ProgramManifest | null>
  writeChannel(manifest: ProgramManifest): Promise<void>
  // The name a new channel starts with: their Publisher name, else nickname.
  initialName(): string
  // This teacher's published courses with a code, and whether each is shown
  // on the channel (unset: published before channels, so not shown).
  publishedCourses(): { code: string; courseId: string; listed: boolean | undefined }[]
  // The course's entry on the channel (its code and titles), or null.
  courseEntry(courseId: string, code: string): Promise<ProgramCourse | null>
  // Publishing signs, so it needs the publishing identity unlocked.
  canPublish(): boolean
  publish(programId: string): Promise<{ code: string }>
  // The channel's code once it's online.
  channelCode(programId: string): string | null
  // Puts these courses online again, so their source.json names the channel.
  reshareCourses(courseIds: string[]): void
}

export function createChannels(deps: ChannelsDeps) {
  let syncing: Promise<void> = Promise.resolve()

  async function own(): Promise<{ programId: string }> {
    const existing = deps.readOwnChannelId()
    if (existing && (await deps.readChannel(existing))) return { programId: existing }
    const programId = await deps.createChannel(deps.initialName())
    deps.writeOwnChannelId(programId)
    return { programId }
  }

  // The listed courses, newest listing first: ones already on the channel
  // keep their place (their entries refreshed), new ones go on top.
  async function rebuild(manifest: ProgramManifest): Promise<ProgramCourse[]> {
    const listed = deps.publishedCourses().filter((course) => course.listed === true)
    const entries = new Map<string, ProgramCourse>()
    for (const course of listed) {
      const entry = await deps.courseEntry(course.courseId, course.code)
      if (entry) entries.set(course.courseId, entry)
    }
    const kept = manifest.courses.filter((course) => entries.has(course.courseId)).map((course) => entries.get(course.courseId)!)
    const added = [...entries.values()].filter((entry) => !manifest.courses.some((course) => course.courseId === entry.courseId))
    return [...added, ...kept]
  }

  async function syncOnce(): Promise<void> {
    const programId = deps.readOwnChannelId()
    const manifest = programId ? await deps.readChannel(programId) : null
    const anyListed = deps.publishedCourses().some((course) => course.listed === true)
    if (!manifest && !anyListed) return
    const channel = manifest ?? (await deps.readChannel((await own()).programId))
    if (!channel) return

    const courses = await rebuild(channel)
    const changed = JSON.stringify(courses) !== JSON.stringify(channel.courses)
    if (changed) await deps.writeChannel({ ...channel, courses })

    const codeBefore = deps.channelCode(channel.id)
    if ((changed || (!codeBefore && anyListed)) && deps.canPublish()) {
      await deps.publish(channel.id)
      // Its first time online: the listed courses can now name it.
      if (!codeBefore) deps.reshareCourses(courses.map((course) => course.courseId))
    }
  }

  return {
    own,

    // After a course is published or its listing changes. One at a time:
    // every call rebuilds from the current state, so none is lost.
    sync(): Promise<void> {
      syncing = syncing.then(syncOnce, syncOnce).catch((error) => {
        console.error('[channels] updating the channel failed:', error)
      })
      return syncing
    },

    // The channel a course of ours names in its source.json: the channel's
    // code while the course is listed and the channel is online.
    codeForCourse(courseId: string): string | null {
      const programId = deps.readOwnChannelId()
      const listed = deps.publishedCourses().find((course) => course.courseId === courseId)?.listed === true
      return programId && listed ? deps.channelCode(programId) : null
    },
  }
}

export type ChannelsService = ReturnType<typeof createChannels>

// What a student is told about an imported course's channel: its code (from
// the course's source.json), and once the channel is here, its name and
// whether it lists the course back (only then is "by <channel>" shown as
// fact).
export function describeForStudent(
  channelCode: string | null,
  courseId: string,
  followedChannel: { manifest: ProgramManifest; programId: string; title: string } | null,
): ChannelForCourse | null {
  if (!channelCode) return null
  if (!followedChannel) return { code: channelCode, listed: null, programId: null, title: null, verified: false }
  return {
    code: channelCode,
    listed: null,
    programId: followedChannel.programId,
    title: followedChannel.title,
    verified: followedChannel.manifest.courses.some((course) => course.courseId === courseId && course.code !== null),
  }
}
