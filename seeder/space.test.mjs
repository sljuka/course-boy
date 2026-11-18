import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_MIN_FREE, diskOf, folderSize, parseSize, spaceState } from './space.mjs'

// SLJ-194: the seeder never fills the box's disk.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-seeder-space-'))
afterAll(() => fs.rmSync(root, { force: true, recursive: true }))

const GB = 1024 ** 3

describe('seeder space (seeder/space.mjs)', () => {
  it('reads sizes the way people write them, in binary units', () => {
    expect(parseSize('40GB')).toBe(40 * GB)
    expect(parseSize('500 mb')).toBe(500 * 1024 ** 2)
    expect(parseSize('1.5TB')).toBe(1.5 * 1024 ** 4)
    expect(parseSize('2048')).toBe(2048)
    expect(parseSize('lots')).toBeNull()
    expect(parseSize('-1GB')).toBeNull()
    expect(parseSize('')).toBeNull()
  })

  it('adds up every file under a folder, and 0 for one not made yet', () => {
    const dir = path.join(root, 'store')
    fs.mkdirSync(path.join(dir, 'cores', 'a'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'cores', 'a', 'data'), Buffer.alloc(3000))
    fs.writeFileSync(path.join(dir, 'db'), Buffer.alloc(1000))

    expect(folderSize(dir)).toBe(4000)
    expect(folderSize(path.join(root, 'missing'))).toBe(0)
    expect(diskOf(root)?.total).toBeGreaterThan(0)
  })

  it('is full at the cap or with too little disk left, and warns before', () => {
    const roomy = { free: 100 * GB, total: 500 * GB }

    expect(spaceState({ disk: roomy, storeBytes: 5 * GB })).toMatchObject({ full: null, low: false, minFree: DEFAULT_MIN_FREE })
    expect(spaceState({ disk: roomy, maxStore: 10 * GB, storeBytes: 10 * GB }).full).toBe('cap')
    expect(spaceState({ disk: roomy, maxStore: 10 * GB, storeBytes: 9.5 * GB })).toMatchObject({ full: null, low: true })
    expect(spaceState({ disk: { free: 0.5 * GB, total: 500 * GB }, storeBytes: 0 }).full).toBe('disk')
    expect(spaceState({ disk: { free: 1.5 * GB, total: 500 * GB }, storeBytes: 0 })).toMatchObject({ full: null, low: true })
    expect(spaceState({ disk: null, storeBytes: 0 })).toMatchObject({ free: null, full: null, low: false })
  })
})
