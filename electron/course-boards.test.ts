import { describe, expect, it, vi } from 'vitest'

import { createCourseBoards, type CourseBoardsState } from './course-boards'
import type { CourseSharingState } from './course-sharing'
import type { BoardWorkerPage } from '../src/lib/course-board'

// SLJ-149: which boards are open on this device, and what the window reads.
const teacherKey = 'aa'.repeat(32)

function setup({
  locked = false,
  page = { closed: true } as BoardWorkerPage,
  shared = [] as string[],
  sharing = { followed: {}, published: {} } as CourseSharingState,
} = {}) {
  let state: CourseBoardsState = { lastRead: {}, settings: { enabled: true, hiddenCourses: [], name: '', ownLimitBytes: 1 } }
  let isLocked = locked
  // Like the worker: a teacher's board needs the identity.
  const op = vi.fn(async (name: string, args: unknown): Promise<unknown> => {
    if (name === 'open' && (args as { publicId?: string }).publicId && isLocked) {
      throw Object.assign(new Error('The publisher identity is locked'), { code: 'LOCKED' })
    }
    if (name === 'read') return page
    if (name === 'readOlder') return { messages: [] }
    return {}
  })
  const boards = createCourseBoards({
    isShared: (courseId) => shared.includes(courseId),
    teacherName: async () => 'Ana',
    op: op as never,
    sharingState: () => sharing,
    store: { read: () => state, write: (next) => (state = next) },
  })
  return {
    boards,
    op,
    opened: () => op.mock.calls.filter(([name]) => name === 'open').map(([, args]) => args),
    state: () => state,
    unlock: () => (isLocked = false),
  }
}

const followed = (driveKey: string, extra = {}) => ({ driveKey, followedSince: '', publisherId: 'p', ...extra })

describe('course boards', () => {
  it("opens the teacher's boards (once unlocked) and imported courses', but not shared or moved ones", async () => {
    const { boards, opened, unlock } = setup({
      locked: true,
      shared: ['shared'],
      sharing: {
        followed: { imported: followed('drive-i'), moved: followed('drive-m', { previousDriveKeys: ['old'] }) },
        published: { mine: { code: 'drive-t', publicId: 'pub' }, shared: { code: 'drive-s', publicId: 'pub2' }, draft: {} },
      },
    })
    await boards.start()
    expect(boards.courseForDriveKey('drive-i')).toBe('imported')
    expect(boards.courseForDriveKey('drive-t')).toBeNull()
    unlock()
    await boards.sync()
    expect(opened()).toContainEqual({ driveKey: 'drive-t', ownLimitBytes: 1, publicId: 'pub' })
    expect(boards.courseForDriveKey('drive-t')).toBe('mine')
    expect(await boards.get('shared')).toEqual({ status: 'unavailable' })
    expect(await boards.get('draft')).toEqual({ status: 'unavailable' })
  })

  it("closes a board the student switches off, and says it's hidden", async () => {
    const { boards, op } = setup({ sharing: { followed: { imported: followed('drive-i') }, published: {} } })
    await boards.start()
    await boards.setShown('imported', false)
    expect(op).toHaveBeenCalledWith('close', { driveKey: 'drive-i' })
    expect(await boards.get('imported')).toEqual({ status: 'hidden' })
    await boards.setShown('imported', true)
    expect(await boards.setSettings({ enabled: false })).toMatchObject({ enabled: false })
    expect(await boards.get('imported')).toEqual({ status: 'hidden' })
  })

  it('shows messages with the teacher badge, own messages and unread counts', async () => {
    const message = (id: string, author: string, date: number) => ({ author, authorId: `${id}xyzw`, date, id, name: '', text: id })
    const page: BoardWorkerPage = {
      isTeacher: false,
      messages: [message('c', 'bb', 3), message('b', teacherKey, 2), message('a', 'cc', 1)],
      moderation: { blocked: [], hidden: [], on: true, seq: 1, studentLimitBytes: 3 },
      peers: 1,
      self: 'bb',
      selfId: 'bbbbzz',
      teacherKey,
    }
    const { boards, state } = setup({ page, sharing: { followed: { imported: followed('drive-i') }, published: {} } })
    await boards.start()
    const board = await boards.get('imported')
    expect(board).toMatchObject({ status: 'on', unread: 2 })
    if (board.status !== 'on') throw new Error('expected on')
    expect(board.messages.map((entry) => [entry.id, entry.isMine, entry.isTeacher, entry.tag])).toEqual([
      ['c', true, false, 'cxyz'],
      ['b', false, true, 'bxyz'],
      ['a', false, false, 'axyz'],
    ])
    expect(await boards.listUnread()).toEqual({ imported: 2 })
    await boards.markRead('imported')
    expect(state().lastRead.imported).toBe(3)
    expect(await boards.listUnread()).toEqual({})
  })

  it('accepts only known moderation changes and sane settings', async () => {
    const { boards } = setup({ sharing: { followed: {}, published: { mine: { code: 'drive-t', publicId: 'pub' } } } })
    await boards.start()
    await expect(boards.moderate('mine', { on: true, extra: 1 })).rejects.toThrow(/Unknown/)
    await expect(boards.moderate('mine', { studentLimitBytes: 5 })).rejects.toThrow(/studentLimitBytes/)
    await expect(boards.moderate('mine', { hide: ['id'], on: true })).resolves.toBeUndefined()
    await expect(boards.setSettings({ name: 'x'.repeat(41) })).rejects.toThrow(/name/)
    await expect(boards.post('elsewhere', 'Hi')).rejects.toThrow(/no board/)
  })
})
