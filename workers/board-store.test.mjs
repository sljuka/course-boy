import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'hypercore-crypto'
import { RATE_LIMIT_WINDOW_MS, createMessage, createModeration } from './board-messages.cjs'
import { openBoardStore as openStore } from './board-store.cjs'

async function openBoardStore(options) {
  const store = await openStore(options)
  stores.push(store)
  return store
}

// SLJ-149: a board's messages on one device, within its limit.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-board-store-'))
const stores = []
// Every store's writes finish before its folder goes.
afterAll(async () => {
  for (const store of stores) await store.flush()
  fs.rmSync(root, { force: true, recursive: true })
})

const course = crypto.keyPair()
const teacherKey = course.publicKey
const boardKey = crypto.randomBytes(32)
let folders = 0
const freshFolder = () => path.join(root, `board-${folders++}`)
const start = 1_800_000_000_000

function message(keyPair, date, text = `message ${date}`) {
  return createMessage({ boardKey, date, keyPair, name: 'Ana', text })
}

describe('board store', () => {
  it('keeps messages newest first and across a restart', async () => {
    const folder = freshFolder()
    const store = await openBoardStore({ boardKey, folder, fs: fsp, teacherKey, limitBytes: 1024 * 1024 })
    const writers = [crypto.keyPair(), crypto.keyPair()]
    for (let i = 0; i < 4; i += 1) expect(store.add(message(writers[i % 2], start + i)).status).toBe('added')
    expect(store.add(message(writers[0], start)).status).toBe('duplicate')
    await store.flush()

    const reopened = await openBoardStore({ boardKey, folder, fs: fsp, teacherKey, limitBytes: 1024 * 1024 })
    const page = reopened.read({ limit: 2 })
    expect(page.map((entry) => entry.message.date)).toEqual([start + 3, start + 2])
    const next = reopened.read({ before: { date: page[1].message.date, id: page[1].id }, limit: 10 })
    expect(next.map((entry) => entry.message.date)).toEqual([start + 1, start])
  })

  it('drops the oldest over its limit and rewrites its file', async () => {
    const folder = freshFolder()
    const sizeOfOne = JSON.stringify(message(course, start)).length + 1
    const store = await openBoardStore({ boardKey, folder, fs: fsp, teacherKey, limitBytes: sizeOfOne * 10 })
    // The teacher (the course's key) has no rate limit.
    for (let i = 0; i < 30; i += 1) store.add(message(course, start + i))
    await store.flush()
    const kept = store.read({ limit: 100 })
    expect(kept.length).toBeLessThanOrEqual(10)
    expect(kept[0].message.date).toBe(start + 29)
    const lines = fs.readFileSync(path.join(folder, `${boardKey.toString('hex')}.messages.jsonl`), 'utf8').trim().split('\n')
    expect(lines.length).toBe(kept.length)
    // Older than everything kept, with no room: not kept.
    expect(store.add(message(course, start - 1)).status).toBe('too-old')
  })

  it('allows a student 10 messages in any 2 days', async () => {
    const store = await openBoardStore({ boardKey, folder: freshFolder(), fs: fsp, teacherKey, limitBytes: 1024 * 1024 })
    const spammer = crypto.keyPair()
    for (let i = 0; i < 10; i += 1) expect(store.add(message(spammer, start + i)).status).toBe('added')
    expect(store.add(message(spammer, start + 10)).status).toBe('rate-limited')
    // Once the first falls out of the window, there's room again.
    expect(store.add(message(spammer, start + RATE_LIMIT_WINDOW_MS + 1)).status).toBe('added')
  })

  it('hides moderated messages and refuses blocked senders, and keeps the newest list', async () => {
    const folder = freshFolder()
    const store = await openBoardStore({ boardKey, folder, fs: fsp, teacherKey, limitBytes: 1024 * 1024 })
    const ana = crypto.keyPair()
    const ben = crypto.keyPair()
    const hiddenId = store.add(message(ana, start)).id
    store.add(message(ben, start + 1))
    store.add(message(ana, start + 2))
    const list = createModeration({
      boardKey,
      keyPair: course,
      teacherKey,
      list: { blocked: [ben.publicKey.toString('hex')], hidden: [hiddenId], on: true, seq: 2 },
    })
    expect(store.setModeration(list)).toBe(true)
    expect(store.setModeration(createModeration({ boardKey, keyPair: course, list: { on: false, seq: 1 }, teacherKey }))).toBe(false)
    expect(store.read().map((entry) => entry.message.date)).toEqual([start + 2])
    expect(store.add(message(ben, start + 3)).status).toBe('blocked')
    await store.flush()
    const reopened = await openBoardStore({ boardKey, folder, fs: fsp, teacherKey, limitBytes: 1024 * 1024 })
    expect(reopened.moderation.seq).toBe(2)
    expect(reopened.read().length).toBe(1)
  })
})
