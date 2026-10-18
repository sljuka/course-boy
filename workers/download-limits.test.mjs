import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Localdrive from 'localdrive'
import { DOWNLOAD_LIMITS, assertFreeSpace, planDownload } from './download-limits.cjs'

// SLJ-153: a download is planned within limits before anything is written.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-download-limits-'))
const stores = []

async function driveWith(name, files) {
  const store = new Corestore(path.join(root, 'stores', name))
  stores.push(store)
  const drive = new Hyperdrive(store)
  await drive.ready()
  for (const [key, content] of Object.entries(files)) await drive.put(key, Buffer.from(content))
  return drive
}

function emptyFolder(name) {
  const folder = path.join(root, name)
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

afterAll(async () => {
  for (const store of stores) await store.close()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('planDownload', () => {
  const files = { '/course.json': '{}', '/a.md': 'aaaa', '/b.md': 'bbbbbbbb' }

  it('adds up what a copy would write', async () => {
    const drive = await driveWith('within', files)
    const target = emptyFolder('within')
    expect(await planDownload(drive, new Localdrive(target))).toEqual({ bytes: 14, files: 3 })
    // Planning writes nothing.
    expect(fs.readdirSync(target)).toEqual([])
  })

  it('refuses a drive with too many files, before writing anything', async () => {
    const drive = await driveWith('many', files)
    const target = emptyFolder('many')
    await expect(
      planDownload(drive, new Localdrive(target), { limits: { ...DOWNLOAD_LIMITS, maxFiles: 2 } }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_FILES', message: expect.stringMatching(/^TOO_MANY_FILES: /) })
    expect(fs.readdirSync(target)).toEqual([])
  })

  it('refuses a drive that is too big', async () => {
    const drive = await driveWith('big', files)
    await expect(
      planDownload(drive, new Localdrive(emptyFolder('big')), { limits: { ...DOWNLOAD_LIMITS, maxBytes: 10 } }),
    ).rejects.toMatchObject({ code: 'COURSE_TOO_BIG' })
  })

  it('stops listing at the first file over a limit', async () => {
    const drive = await driveWith('stops', files)
    let listed = 0
    await expect(
      planDownload(drive, new Localdrive(emptyFolder('stops')), {
        limits: { ...DOWNLOAD_LIMITS, maxFiles: 1 },
        onEntry: () => (listed += 1),
      }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_FILES' })
    expect(listed).toBe(2)
  })

  it('counts only what an update would change', async () => {
    const drive = await driveWith('update', files)
    const target = emptyFolder('update')
    fs.writeFileSync(path.join(target, 'course.json'), '{}')
    fs.writeFileSync(path.join(target, 'a.md'), 'aaaa')
    expect(await planDownload(drive, new Localdrive(target))).toEqual({ bytes: 8, files: 1 })
  })
})

describe('assertFreeSpace', () => {
  const fspWith = (bavail) => ({ statfs: async () => ({ bavail, bsize: 1 }) })
  const limits = { ...DOWNLOAD_LIMITS, spareBytes: 100 }

  it('needs twice the download plus the spare space', async () => {
    await expect(assertFreeSpace(fspWith(300), root, 100, { limits })).resolves.toBeUndefined()
    await expect(assertFreeSpace(fspWith(299), root, 100, { limits })).rejects.toMatchObject({ code: 'NOT_ENOUGH_SPACE' })
  })

  it("doesn't refuse when the free space can't be read", async () => {
    const failing = { statfs: async () => Promise.reject(new Error('unsupported')) }
    await expect(assertFreeSpace(failing, root, 10 ** 15, { limits })).resolves.toBeUndefined()
  })

  it('reads a real disk', async () => {
    await expect(assertFreeSpace(fs.promises, root, 1)).resolves.toBeUndefined()
  })
})
