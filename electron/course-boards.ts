// Course boards on this device (SLJ-149): which courses' boards are open in
// the worker, and what the window reads and does on them.
//
// A board opens for:
// - each course this profile published (it has a code), as the teacher: the
//   worker signs the moderation list and the teacher's messages with the
//   course's own key, which needs the identity unlocked. Whether it is, the
//   worker says (LOCKED): main's own flag changes only after the worker has
//   the identity, so a sync right after the hand-off would read it too early;
// - each imported course, as a student.
// Not for courses shared by several maintainers (SLJ-11): their code isn't a
// key one person signs with, so nobody could moderate the board (phase 1).
// And not while the student switched boards off, for one course or all.
//
// Opening a board doesn't turn it on: the teacher does, in the moderation
// list, and until then only that list travels (workers/board-sync.cjs).

import type {
  BoardCursor,
  BoardMessage,
  BoardModerationChanges,
  BoardSettings,
  BoardWorkerMessage,
  CourseBoard,
} from '../src/lib/course-board'
import {
  DEFAULT_STUDENT_LIMIT_BYTES,
  DEFAULT_TEACHER_LIMIT_BYTES,
  MAX_BOARD_NAME_LENGTH,
  MAX_STUDENT_LIMIT_BYTES,
  MIN_STUDENT_LIMIT_BYTES,
} from '../src/lib/course-board'
import type { boardOp } from './bare-worker'
import type { CourseSharingState } from './course-sharing'

export type CourseBoardsState = {
  // The newest message date the person has seen, per course: newer messages
  // from others are unread.
  lastRead: Record<string, number>
  settings: BoardSettings
}

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  enabled: true,
  hiddenCourses: [],
  name: '',
  ownLimitBytes: DEFAULT_TEACHER_LIMIT_BYTES,
}

export type CourseBoardsDeps = {
  // The teacher's name on their own courses' boards: their channel's.
  teacherName(): Promise<string>
  isShared(courseId: string): boolean
  op: typeof boardOp
  sharingState(): Pick<CourseSharingState, 'followed' | 'published'>
  store: { read(): CourseBoardsState; write(state: CourseBoardsState): void }
}

type Target = { driveKey: string; publicId?: string }

// The first page of a board, and at most this many when counting unread.
const PAGE_SIZE = 50
const UNREAD_LIMIT = 100
const ALLOWED_CHANGES = new Set(['block', 'hide', 'on', 'studentLimitBytes', 'unblock', 'unhide'])

const segmenter = new Intl.Segmenter()

// Characters as people see them, as the worker counts them.
function countGraphemes(text: string): number {
  return [...segmenter.segment(text)].length
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

// Only what moderation is made of, from the window.
function cleanChanges(changes: unknown): BoardModerationChanges {
  if (!changes || typeof changes !== 'object') throw new Error('Invalid moderation changes')
  const entries = Object.entries(changes as Record<string, unknown>)
  const clean: BoardModerationChanges = {}
  for (const [key, value] of entries) {
    if (!ALLOWED_CHANGES.has(key)) throw new Error(`Unknown moderation change: ${key}`)
    if (key === 'on') {
      if (typeof value !== 'boolean') throw new Error('Invalid moderation change: on')
      clean.on = value
    } else if (key === 'studentLimitBytes') {
      if (!Number.isSafeInteger(value) || (value as number) < MIN_STUDENT_LIMIT_BYTES || (value as number) > MAX_STUDENT_LIMIT_BYTES) {
        throw new Error('Invalid moderation change: studentLimitBytes')
      }
      clean.studentLimitBytes = value as number
    } else {
      if (!isStringList(value)) throw new Error(`Invalid moderation change: ${key}`)
      clean[key as 'block' | 'hide' | 'unblock' | 'unhide'] = value
    }
  }
  return clean
}

export function createCourseBoards(deps: CourseBoardsDeps) {
  // Open in the worker: course id -> what it was opened with.
  const opened = new Map<string, Target>()
  let syncing: Promise<void> = Promise.resolve()
  let stopped = false

  function state(): CourseBoardsState {
    const current = deps.store.read()
    return {
      lastRead: current.lastRead ?? {},
      settings: { ...DEFAULT_BOARD_SETTINGS, ...current.settings },
    }
  }

  function update(change: (current: CourseBoardsState) => CourseBoardsState) {
    deps.store.write(change(state()))
  }

  // The courses that could have a board here, whether or not it's switched
  // off: teacher's (with the course's public id) and imported.
  function candidates(): Map<string, Target> {
    const { followed, published } = deps.sharingState()
    const targets = new Map<string, Target>()
    for (const [courseId, entry] of Object.entries(published)) {
      if (entry.code && entry.publicId && !deps.isShared(courseId)) {
        targets.set(courseId, { driveKey: entry.code, publicId: entry.publicId })
      }
    }
    for (const [courseId, course] of Object.entries(followed)) {
      // A course that moved to several maintainers (it has old codes).
      if (targets.has(courseId) || course.previousDriveKeys?.length) continue
      targets.set(courseId, { driveKey: course.driveKey })
    }
    return targets
  }

  function isHiddenHere(courseId: string, settings = state().settings): boolean {
    return !settings.enabled || settings.hiddenCourses.includes(courseId)
  }

  // What should be open now: what isn't switched off. (A teacher's board
  // opens only while the identity is unlocked; the worker refuses it before.)
  function wanted(): Map<string, Target> {
    const { settings } = state()
    const targets = new Map<string, Target>()
    for (const [courseId, target] of candidates()) {
      if (!isHiddenHere(courseId, settings)) targets.set(courseId, target)
    }
    return targets
  }

  async function syncNow(): Promise<void> {
    if (stopped) return
    const targets = wanted()
    const { ownLimitBytes } = state().settings
    for (const [courseId, target] of [...opened]) {
      const next = targets.get(courseId)
      if (next && next.driveKey === target.driveKey && next.publicId === target.publicId) continue
      opened.delete(courseId)
      await deps.op('close', { driveKey: target.driveKey }).catch((error) => console.error('[course-boards] close failed:', error))
    }
    for (const [courseId, target] of targets) {
      try {
        // Again for those already open: the teacher's own limit may have changed.
        await deps.op('open', { ...target, ...(target.publicId ? { ownLimitBytes } : {}) })
        opened.set(courseId, target)
      } catch (error) {
        // Locked: opened again once the identity is unlocked (main syncs then).
        if ((error as { code?: string }).code !== 'LOCKED') {
          console.error(`[course-boards] opening the board of ${courseId} failed:`, error)
        }
      }
    }
  }

  // One sync at a time, in order.
  function sync(): Promise<void> {
    syncing = syncing.then(syncNow, syncNow)
    return syncing
  }

  function toMessage(message: BoardWorkerMessage, teacherKey: string, self: string): BoardMessage {
    return {
      author: message.author,
      date: message.date,
      id: message.id,
      isMine: message.author === self,
      isTeacher: message.author === teacherKey,
      name: message.name,
      tag: message.authorId.slice(0, 4),
      text: message.text,
    }
  }

  async function readPage(courseId: string, options: { before?: BoardCursor | null; limit: number }) {
    const target = opened.get(courseId)
    if (!target) return null
    const page = await deps.op('read', { driveKey: target.driveKey, ...options })
    return 'closed' in page ? null : page
  }

  function requireOpen(courseId: string): Target {
    const target = opened.get(courseId)
    if (!target) throw Object.assign(new Error('This course has no board here'), { code: 'NO_BOARD' })
    return target
  }

  return {
    start: sync,
    sync,

    stop() {
      stopped = true
      opened.clear()
    },

    // The course a board change belongs to (the worker names boards by code).
    courseForDriveKey(driveKey: string): string | null {
      for (const [courseId, target] of opened) if (target.driveKey === driveKey) return courseId
      return null
    },

    async get(courseId: string): Promise<CourseBoard> {
      if (!candidates().has(courseId)) return { status: 'unavailable' }
      if (isHiddenHere(courseId)) return { status: 'hidden' }
      const page = await readPage(courseId, { limit: PAGE_SIZE })
      if (!page) return { status: 'unavailable' }
      if (!page.moderation?.on) return { isTeacher: page.isTeacher, status: 'off' }
      const messages = page.messages.map((message) => toMessage(message, page.teacherKey, page.self))
      const lastRead = state().lastRead[courseId] ?? 0
      return {
        isTeacher: page.isTeacher,
        messages,
        peers: page.peers,
        self: { author: page.self, name: page.isTeacher ? await deps.teacherName() : null, tag: page.selfId.slice(0, 4) },
        status: 'on',
        studentLimitBytes: page.moderation.studentLimitBytes ?? DEFAULT_STUDENT_LIMIT_BYTES,
        unread: messages.filter((message) => !message.isMine && message.date > lastRead).length,
      }
    },

    // Older messages than `before`: this device's first, then connected
    // devices' (not kept here).
    async readOlder(courseId: string, before: BoardCursor): Promise<BoardMessage[]> {
      if (!before || !Number.isSafeInteger(before.date) || typeof before.id !== 'string') throw new Error('Invalid cursor')
      const target = requireOpen(courseId)
      const page = await readPage(courseId, { before, limit: PAGE_SIZE })
      if (!page) return []
      const messages = page.messages.map((message) => toMessage(message, page.teacherKey, page.self))
      if (messages.length < PAGE_SIZE) {
        const last = messages.at(-1)
        const { messages: older } = await deps.op('readOlder', {
          before: last ? { date: last.date, id: last.id } : before,
          driveKey: target.driveKey,
          limit: PAGE_SIZE - messages.length,
        })
        messages.push(...older.map((message) => toMessage(message, page.teacherKey, page.self)))
      }
      return messages
    },

    async post(courseId: string, text: unknown): Promise<BoardMessage> {
      if (typeof text !== 'string') throw new Error('Invalid message')
      const target = requireOpen(courseId)
      // The teacher posts under their channel's name (with the badge only the
      // course's key gives); a student under their board name.
      const name = target.publicId ? await deps.teacherName() : state().settings.name
      const message = await deps.op('post', { driveKey: target.driveKey, name, text })
      const page = await readPage(courseId, { limit: 1 })
      return toMessage(message, page?.teacherKey ?? '', page?.self ?? message.author)
    },

    async moderate(courseId: string, changes: unknown): Promise<void> {
      const target = requireOpen(courseId)
      await deps.op('moderate', { changes: cleanChanges(changes), driveKey: target.driveKey })
    },

    // Everything on the board so far has been seen.
    async markRead(courseId: string): Promise<void> {
      const page = await readPage(courseId, { limit: 1 })
      const newest = page?.messages[0]?.date
      if (newest == null) return
      update((current) => ({ ...current, lastRead: { ...current.lastRead, [courseId]: newest } }))
    },

    // Unread messages per course (at most UNREAD_LIMIT each), on boards that
    // are on; courses with none are left out.
    async listUnread(): Promise<Record<string, number>> {
      const { lastRead } = state()
      const counts: Record<string, number> = {}
      for (const courseId of opened.keys()) {
        const page = await readPage(courseId, { limit: UNREAD_LIMIT }).catch(() => null)
        if (!page?.moderation?.on) continue
        const count = page.messages.filter(
          (message) => message.author !== page.self && message.date > (lastRead[courseId] ?? 0),
        ).length
        if (count > 0) counts[courseId] = count
      }
      return counts
    },

    getSettings(): BoardSettings {
      return state().settings
    },

    async setSettings(changes: unknown): Promise<BoardSettings> {
      if (!changes || typeof changes !== 'object') throw new Error('Invalid board settings')
      const { enabled, name, ownLimitBytes } = changes as Partial<BoardSettings>
      const next = { ...state().settings }
      if (enabled !== undefined) {
        if (typeof enabled !== 'boolean') throw new Error('Invalid board settings: enabled')
        next.enabled = enabled
      }
      if (name !== undefined) {
        if (typeof name !== 'string' || countGraphemes(name.trim()) > MAX_BOARD_NAME_LENGTH) throw new Error('Invalid board settings: name')
        next.name = name.trim()
      }
      if (ownLimitBytes !== undefined) {
        if (!Number.isSafeInteger(ownLimitBytes) || ownLimitBytes < MIN_STUDENT_LIMIT_BYTES) {
          throw new Error('Invalid board settings: ownLimitBytes')
        }
        next.ownLimitBytes = ownLimitBytes
      }
      update((current) => ({ ...current, settings: next }))
      await sync()
      return next
    },

    // "Show this course's board" on this device.
    async setShown(courseId: string, shown: boolean): Promise<void> {
      if (typeof courseId !== 'string' || typeof shown !== 'boolean') throw new Error('Invalid input')
      update((current) => {
        const hidden = new Set(current.settings.hiddenCourses)
        if (shown) hidden.delete(courseId)
        else hidden.add(courseId)
        return { ...current, settings: { ...current.settings, hiddenCourses: [...hidden] } }
      })
      await sync()
    },

    // The course is gone from this device: its board too, files and all.
    async forget(courseId: string): Promise<void> {
      const target = opened.get(courseId)
      opened.delete(courseId)
      update((current) => {
        const { [courseId]: _removed, ...lastRead } = current.lastRead
        return {
          ...current,
          lastRead,
          settings: { ...current.settings, hiddenCourses: current.settings.hiddenCourses.filter((id) => id !== courseId) },
        }
      })
      if (target) await deps.op('close', { driveKey: target.driveKey, remove: true })
    },
  }
}

export type CourseBoards = ReturnType<typeof createCourseBoards>
