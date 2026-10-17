import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { NoSymlinkLocaldrive, assertNoSymlinksOnDisk, findSymlinkOnDisk } from './drive-safety.cjs'

// SLJ-150: a drive's symlinks never reach the disk.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-drive-safety-'))
const stores = []

async function makeDrive(name, fill) {
  const store = new Corestore(path.join(root, 'stores', name))
  stores.push(store)
  const drive = new Hyperdrive(store)
  await drive.ready()
  await fill(drive)
  return drive
}

function freshFolder(name) {
  const folder = path.join(root, name)
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

afterAll(async () => {
  for (const store of stores) await store.close()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('NoSymlinkLocaldrive', () => {
  it('refuses a drive whose symlink would lead a write outside the folder', async () => {
    const outside = freshFolder('outside')
    const target = path.join(freshFolder('import-1'), 'staging')
    const drive = await makeDrive('hostile', async (d) => {
      await d.put('/course.json', Buffer.from('{}'))
      await d.symlink('/assets', '../../outside')
      await d.put('/assets/pwned.txt', Buffer.from('written outside the course folder'))
    })

    await expect(drive.mirror(new NoSymlinkLocaldrive(target)).done()).rejects.toMatchObject({
      code: 'SYMLINK_REFUSED',
    })
    expect(fs.readdirSync(outside)).toEqual([])
    expect(await findSymlinkOnDisk(fsp, path, target)).toBeNull()
  })

  it('copies an ordinary course as before', async () => {
    const target = path.join(freshFolder('import-2'), 'staging')
    const drive = await makeDrive('ordinary', async (d) => {
      await d.put('/course.json', Buffer.from('{"id":"abcdefghijklmnop"}'))
      await d.put('/assets/photo.png', Buffer.from('png'))
    })

    await drive.mirror(new NoSymlinkLocaldrive(target, { atomic: true })).done()
    expect(fs.readFileSync(path.join(target, 'assets', 'photo.png'), 'utf8')).toBe('png')
  })
})

describe('findSymlinkOnDisk', () => {
  it('finds a symlink deep in the folder, never following it', async () => {
    const folder = freshFolder('walk-link')
    fs.mkdirSync(path.join(folder, 'versions', '1', 'assets'), { recursive: true })
    fs.symlinkSync(os.homedir(), path.join(folder, 'versions', '1', 'assets', 'home'))

    expect(await findSymlinkOnDisk(fsp, path, folder)).toBe(path.join('versions', '1', 'assets', 'home'))
    await expect(assertNoSymlinksOnDisk(fsp, path, folder)).rejects.toMatchObject({ code: 'SYMLINK_REFUSED' })
  })

  it('passes hardlinks (unchanged files between versions) and a missing folder', async () => {
    const folder = freshFolder('walk-hardlink')
    fs.mkdirSync(path.join(folder, 'v1'))
    fs.mkdirSync(path.join(folder, 'v2'))
    fs.writeFileSync(path.join(folder, 'v1', 'lesson.md'), '# Lesson')
    fs.linkSync(path.join(folder, 'v1', 'lesson.md'), path.join(folder, 'v2', 'lesson.md'))

    expect(await findSymlinkOnDisk(fsp, path, folder)).toBeNull()
    expect(await findSymlinkOnDisk(fsp, path, path.join(folder, 'not-there'))).toBeNull()
  })
})
