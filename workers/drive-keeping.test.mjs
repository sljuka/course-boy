import { afterAll, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { keepCurrentVersion, missingFiles } from './drive-keeping.cjs'

// SLJ-144: a seeder keeps a full copy of a drive's current version, so it can
// serve students alone once the teacher is offline.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-drive-keeping-'))
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

afterAll(async () => {
  for (const store of stores) await store.close().catch(() => {})
  fs.rmSync(root, { force: true, recursive: true })
})

describe('keeping a drive (SLJ-144)', () => {
  const firstVideo = crypto.randomBytes(1024 * 1024)
  const secondVideo = crypto.randomBytes(1024 * 1024)

  it('a follower holds none of the files; a kept drive holds them all and serves a new student alone, also its next version', async () => {
    const teacher = new Hyperdrive(makeStore('teacher'))
    await teacher.ready()
    await teacher.put('/course.json', Buffer.from(JSON.stringify({ id: 'course-a', version: '0.1' })))
    await teacher.put('/lesson.md', Buffer.from('# A lesson'))
    await teacher.put('/video.bin', firstVideo)

    // Following only: the index, but none of the files.
    const followerStore = makeStore('follower')
    const follower = new Hyperdrive(followerStore, teacher.key)
    await follower.ready()
    const cutFollower = connect(teacher.corestore, followerStore)
    await follower.update({ wait: true })
    expect((await missingFiles(follower)).sort()).toEqual(['/course.json', '/lesson.md', '/video.bin'])
    cutFollower()

    // Kept: every file of the current version.
    const seederStore = makeStore('seeder')
    const seeder = new Hyperdrive(seederStore, teacher.key)
    await seeder.ready()
    let cutTeacher = connect(teacher.corestore, seederStore)
    await expect(keepCurrentVersion(seeder)).resolves.toEqual({ files: 3, version: teacher.version })
    expect(await missingFiles(seeder)).toEqual([])
    cutTeacher()

    // The teacher is offline: a new student gets everything from the seeder.
    const studentStore = makeStore('student')
    const student = new Hyperdrive(studentStore, teacher.key)
    await student.ready()
    const cutStudent = connect(seederStore, studentStore)
    await student.update({ wait: true })
    expect(Buffer.compare(await student.get('/video.bin'), firstVideo)).toBe(0)
    expect((await student.get('/lesson.md')).toString()).toBe('# A lesson')

    // A new version, kept while the teacher is briefly online again.
    await teacher.put('/video.bin', secondVideo)
    await teacher.put('/course.json', Buffer.from(JSON.stringify({ id: 'course-a', version: '0.2' })))
    cutTeacher = connect(teacher.corestore, seederStore)
    await expect(keepCurrentVersion(seeder)).resolves.toEqual({ files: 3, version: teacher.version })
    cutTeacher()

    // The student, still connected only to the seeder, gets it.
    await student.update({ wait: true })
    expect(Buffer.compare(await student.get('/video.bin'), secondVideo)).toBe(0)
    expect(JSON.parse(await student.get('/course.json')).version).toBe('0.2')
    cutStudent()
  })
})
