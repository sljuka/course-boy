import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'hypercore-crypto'
import SecretStream from '@hyperswarm/secret-stream'
import { createBoards } from './board-sync.cjs'

// SLJ-149: boards between devices over Protomux. A teacher and two students;
// the second student is connected only to the first, so whatever reaches
// them went through a classmate.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-board-sync-'))
const streams = []
const allBoards = []
// Every board's writes finish before its folder goes.
afterAll(async () => {
  for (const stream of streams) stream.destroy()
  for (const boards of allBoards) await boards.closeAll()
  fs.rmSync(root, { force: true, recursive: true })
})

let devices = 0
// Every reading of the clock is a millisecond later, so posts in a loop
// have different dates.
let clock = Date.now() - 60 * 60_000
function device() {
  const changes = []
  const boards = createBoards({
    folder: path.join(root, `device-${devices++}`),
    fs: fsp,
    now: () => ++clock,
    onChange: (hex) => changes.push(hex),
  })
  allBoards.push(boards)
  return { boards, changes, keyPair: crypto.keyPair() }
}

function connect(a, b) {
  const left = new SecretStream(true)
  const right = new SecretStream(false)
  left.rawStream.pipe(right.rawStream).pipe(left.rawStream)
  streams.push(left, right)
  a.boards.attach(left)
  b.boards.attach(right)
}

async function until(check, timeout = 3000) {
  const end = Date.now() + timeout
  while (!check()) {
    if (Date.now() > end) throw new Error('Timed out')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

const texts = (device, key) => device.boards.read(key).messages.map((message) => message.text)

describe('board sync', () => {
  it('stays off until the teacher turns it on, then messages travel through classmates', async () => {
    const course = crypto.keyPair()
    const teacherKey = course.publicKey
    const key = crypto.randomBytes(32)
    const teacher = device()
    const ana = device()
    const ben = device()
    await teacher.boards.open(key, { authorKeyPair: teacher.keyPair, courseKeyPair: course, teacherKey })
    await ana.boards.open(key, { authorKeyPair: ana.keyPair, teacherKey })
    await ben.boards.open(key, { authorKeyPair: ben.keyPair, teacherKey })
    connect(teacher, ana)
    connect(ana, ben)
    await until(() => teacher.boards.read(key).peers === 1 && ben.boards.read(key).peers === 1)

    expect(() => ana.boards.post(key, { text: 'Too early' })).toThrow(/off/)
    expect(() => ana.boards.moderate(key, { on: true })).toThrow(/teacher/)

    teacher.boards.moderate(key, { on: true })
    await until(() => ben.boards.read(key).moderation?.on === true)

    ben.boards.post(key, { name: 'Ben', text: 'Hi from Ben' })
    await until(() => texts(teacher, key).includes('Hi from Ben'))
    const welcome = teacher.boards.post(key, { name: 'Teacher', text: 'Welcome' })
    expect(welcome.author).toBe(teacherKey.toString('hex'))
    await until(() => texts(ben, key).includes('Welcome'))
    expect(ben.changes.length).toBeGreaterThan(0)
  })

  it('pairs up a board opened on one side after connecting', async () => {
    const course = crypto.keyPair()
    const teacherKey = course.publicKey
    const key = crypto.randomBytes(32)
    const teacher = device()
    const ana = device()
    connect(teacher, ana)
    await ana.boards.open(key, { authorKeyPair: ana.keyPair, teacherKey })
    // Ana's open was refused (the teacher had no board yet); the teacher's
    // own open, later, pairs with it.
    await new Promise((resolve) => setTimeout(resolve, 50))
    await teacher.boards.open(key, { authorKeyPair: teacher.keyPair, courseKeyPair: course, teacherKey })
    teacher.boards.moderate(key, { on: true })
    await until(() => ana.boards.read(key).moderation?.on === true)
  })

  it('catches up on connecting, and follows hiding and blocking', async () => {
    const course = crypto.keyPair()
    const teacherKey = course.publicKey
    const key = crypto.randomBytes(32)
    const teacher = device()
    const ana = device()
    const ben = device()
    await teacher.boards.open(key, { authorKeyPair: teacher.keyPair, courseKeyPair: course, teacherKey })
    await ana.boards.open(key, { authorKeyPair: ana.keyPair, teacherKey })
    connect(teacher, ana)
    await until(() => ana.boards.read(key).peers === 1)
    teacher.boards.moderate(key, { on: true })
    await until(() => ana.boards.read(key).moderation?.on === true)
    const rude = ana.boards.post(key, { text: 'Rude' })
    ana.boards.post(key, { text: 'Kind' })
    await until(() => texts(teacher, key).length === 2)

    // Ben joins later, through Ana only: the list and the messages reach him.
    await ben.boards.open(key, { authorKeyPair: ben.keyPair, teacherKey })
    connect(ana, ben)
    await until(() => texts(ben, key).length === 2)

    teacher.boards.moderate(key, { hide: [rude.id] })
    await until(() => texts(ben, key).join() === 'Kind')

    const spam = ben.boards.post(key, { text: 'Spam' })
    await until(() => texts(teacher, key).includes('Spam'))
    teacher.boards.moderate(key, { block: [spam.author] })
    await until(() => !texts(ana, key).includes('Spam'))
    // A blocked sender's own device has the list too and keeps nothing new.
    await until(() => ben.boards.read(key).moderation.blocked.includes(spam.author))
    expect(() => ben.boards.post(key, { text: 'More spam' })).toThrow(/blocked/)
  })

  it('reads older messages from connected devices without keeping them', async () => {
    const course = crypto.keyPair()
    const teacherKey = course.publicKey
    const key = crypto.randomBytes(32)
    const teacher = device()
    const ana = device()
    await teacher.boards.open(key, { authorKeyPair: teacher.keyPair, courseKeyPair: course, teacherKey })
    await ana.boards.open(key, { authorKeyPair: ana.keyPair, teacherKey })
    teacher.boards.moderate(key, { on: true })
    for (let i = 0; i < 5; i += 1) teacher.boards.post(key, { text: `Note ${i}` })
    connect(teacher, ana)
    await until(() => texts(ana, key).length === 5)

    const [, , oldest] = teacher.boards.read(key, { limit: 3 }).messages
    const older = await ana.boards.readOlder(key, { before: { date: oldest.date, id: oldest.id }, limit: 10 })
    expect(older.length).toBe(2)
    expect(older.every((message) => message.date <= oldest.date)).toBe(true)
  })

  it('keeps a student within the limit the teacher sets', async () => {
    const course = crypto.keyPair()
    const teacherKey = course.publicKey
    const key = crypto.randomBytes(32)
    const teacher = device()
    const ana = device()
    await teacher.boards.open(key, { authorKeyPair: teacher.keyPair, courseKeyPair: course, teacherKey })
    await ana.boards.open(key, { authorKeyPair: ana.keyPair, teacherKey })
    teacher.boards.moderate(key, { on: true, studentLimitBytes: 256 * 1024 })
    const text = 'x'.repeat(250)
    for (let i = 0; i < 1000; i += 1) teacher.boards.post(key, { text: `${i} ${text}` })
    connect(teacher, ana)
    await until(() => ana.boards.read(key).moderation?.studentLimitBytes === 256 * 1024)
    await until(() => texts(ana, key).length > 0)
    await new Promise((resolve) => setTimeout(resolve, 200))
    const kept = ana.boards.read(key, { limit: 2000 }).messages
    expect(kept.length).toBeLessThan(1000)
    expect(kept[0].text.startsWith('999 ')).toBe(true)
    expect(teacher.boards.read(key, { limit: 2000 }).messages.length).toBe(1000)
  })
})
