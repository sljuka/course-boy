import { afterAll, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { clearOldVersions, clearingIsSafe } from './drive-storage.cjs'

// SLJ-113: old versions' file data cleared, the current version untouched.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-drive-storage-'))
const stores = []

function makeStore(name) {
  const store = new Corestore(path.join(root, name))
  stores.push(store)
  return store
}

// Two stores replicating directly; returns a way to cut them apart.
function connect(a, b) {
  const left = a.replicate(true)
  const right = b.replicate(false)
  left.pipe(right).pipe(left)
  return () => {
    left.destroy()
    right.destroy()
  }
}

async function heldBlocks(core) {
  let held = 0
  for (let index = 0; index < core.length; index++) if (await core.has(index)) held++
  return held
}

afterAll(async () => {
  for (const store of stores) await store.close().catch(() => {})
  fs.rmSync(root, { force: true, recursive: true })
})

describe('clearing old versions (SLJ-113)', () => {
  // 64 KB blocks: a 1 MB "video" is 16 of them.
  const oldVideo = crypto.randomBytes(1024 * 1024)
  const newVideo = crypto.randomBytes(1024 * 1024)
  const lesson = Buffer.from('# A lesson that never changes')

  // With an older Hypercore (whose `clear` dropped a neighbouring block's tree
  // node), these run once it's updated; the guard is tested below.
  it.skipIf(!clearingIsSafe())("frees a replaced file's blocks on the teacher's computer and keeps the current version whole", async () => {
    const teacherStore = makeStore('teacher')
    const teacher = new Hyperdrive(teacherStore.session())
    await teacher.ready()
    await teacher.put('/lesson.md', lesson)
    await teacher.put('/video.bin', oldVideo)
    await teacher.put('/removed.bin', crypto.randomBytes(200_000))

    // The next version: the video replaced, a file removed.
    await teacher.put('/video.bin', newVideo)
    await teacher.del('/removed.bin')
    const blobs = (await teacher.getBlobs()).core
    const before = await heldBlocks(blobs)

    const cleared = await clearOldVersions(teacher)
    expect(cleared).toBeGreaterThan(0)
    const after = await heldBlocks(blobs)
    // About the old video and the removed file are gone.
    expect(before - after).toBe(cleared)
    expect((await teacher.get('/video.bin')).equals(newVideo)).toBe(true)
    expect((await teacher.get('/lesson.md')).equals(lesson)).toBe(true)
    // Clearing again changes nothing.
    await clearOldVersions(teacher)
    expect(await heldBlocks(blobs)).toBe(after)

    // A new student imports from this computer alone: the current version is all there.
    const freshStore = makeStore('fresh-student')
    const disconnect = connect(teacherStore, freshStore)
    const fresh = new Hyperdrive(freshStore.session(), teacher.key)
    await fresh.ready()
    await fresh.update({ wait: true })
    expect((await fresh.get('/video.bin')).equals(newVideo)).toBe(true)
    // Its first block sits right before the cleared range: still provable.
    expect((await fresh.get('/lesson.md')).equals(lesson)).toBe(true)
    disconnect()
    await fresh.close()
    await teacher.close()
  }, 60_000)

  it.skipIf(!clearingIsSafe())("frees a student's blocks of an earlier version, and the current one still reads offline", async () => {
    const teacherStore = makeStore('teacher-2')
    const studentStore = makeStore('student-2')
    const teacher = new Hyperdrive(teacherStore.session())
    await teacher.ready()
    await teacher.put('/lesson.md', lesson)
    await teacher.put('/video.bin', oldVideo)

    // The student downloaded the first version whole.
    const disconnect = connect(teacherStore, studentStore)
    const student = new Hyperdrive(studentStore.session(), teacher.key)
    await student.ready()
    await student.update({ wait: true })
    await student.download('/').done()

    // The teacher replaces the video; the student's update fetches it.
    await teacher.put('/video.bin', newVideo)
    await student.update({ wait: true })
    expect((await student.get('/video.bin')).equals(newVideo)).toBe(true)
    const blobs = (await student.getBlobs()).core
    const before = await heldBlocks(blobs)

    expect(await clearOldVersions(student)).toBeGreaterThan(0)
    expect(await heldBlocks(blobs)).toBeLessThan(before)

    // Cut off from the teacher: the current version is all here.
    disconnect()
    expect((await student.get('/video.bin', { wait: false })).equals(newVideo)).toBe(true)
    expect((await student.get('/lesson.md', { wait: false })).equals(lesson)).toBe(true)
    await student.close()
    await teacher.close()
  }, 60_000)

  // In the app a Publish writes again right after (source.json, when the
  // course is shared): what's written while clearing belongs to the next
  // version and stays.
  it.skipIf(!clearingIsSafe())('never clears what was written after the version it works on', async () => {
    const store = makeStore('race')
    const drive = new Hyperdrive(store.session())
    await drive.ready()
    await drive.put('/video.bin', oldVideo)
    await drive.put('/video.bin', newVideo)
    const clearing = clearOldVersions(drive)
    await drive.put('/source.json', Buffer.from('{"written":"meanwhile"}'))
    await clearing
    expect((await drive.get('/source.json', { wait: false })).toString()).toContain('meanwhile')
    expect((await drive.get('/video.bin', { wait: false })).equals(newVideo)).toBe(true)
    await drive.close()
  })

  it('clears only with a Hypercore whose clear is safe, and otherwise leaves the drive alone', async () => {
    expect(clearingIsSafe('11.35.2')).toBe(false)
    expect(clearingIsSafe('11.37.1')).toBe(false)
    expect(clearingIsSafe('11.37.2')).toBe(true)
    expect(clearingIsSafe('11.40.0')).toBe(true)
    expect(clearingIsSafe('12.0.0')).toBe(true)
    expect(clearingIsSafe(null)).toBe(false)

    const store = makeStore('unsafe')
    const drive = new Hyperdrive(store.session())
    await drive.ready()
    await drive.put('/video.bin', oldVideo)
    await drive.put('/video.bin', newVideo)
    const blobs = (await drive.getBlobs()).core
    const before = await heldBlocks(blobs)
    expect(await clearOldVersions(drive, { safe: false })).toBe(0)
    expect(await heldBlocks(blobs)).toBe(before)
    await drive.close()
  })
})

