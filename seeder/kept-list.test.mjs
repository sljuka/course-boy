import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import IdEncoding from 'hypercore-id-encoding'
import { addCode, codeFromInput, readKeptList, removeCode } from './kept-list.mjs'

// SLJ-144: the seeder's list of codes to keep.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-seeder-list-'))
afterAll(() => fs.rmSync(root, { force: true, recursive: true }))

const code = 'fwy8xnz8ejdswp6aukomadwpeitpspbgotbm3c8zk4mzsxrhyk1y'
const other = 'c3ddn9gsf851ytetgqtj3xabb4p4cozbyggiqptfdmtmh7g7b7xo'

describe('the seeder list (seeder/kept-list.mjs)', () => {
  it('takes a code or an import link, as the app shows them, and nothing else', () => {
    expect(codeFromInput(code)).toBe(code)
    expect(codeFromInput(`  ${code.toUpperCase()}  `)).toBe(code)
    expect(codeFromInput(`matko://import/${code}`)).toBe(code)
    expect(codeFromInput(`matko://import/${code}/`)).toBe(code)
    // The same key as hex comes back as the code the app shows.
    const hex = Buffer.from(IdEncoding.decode(code)).toString('hex')
    expect(codeFromInput(hex)).toBe(code)
    expect(codeFromInput(`matko://course/${code}`)).toBeNull()
    expect(codeFromInput('not a code')).toBeNull()
    expect(codeFromInput('')).toBeNull()
  })

  it('adds, lists and removes codes, once each, in a file written whole', () => {
    const dataDir = path.join(root, 'one')
    expect(readKeptList(dataDir)).toEqual([])
    expect(addCode(dataDir, code, new Date('2026-11-10T10:00:00Z'))).toBe(true)
    expect(addCode(dataDir, code)).toBe(false)
    expect(addCode(dataDir, other, new Date('2026-11-10T11:00:00Z'))).toBe(true)
    expect(readKeptList(dataDir)).toEqual([
      { addedAt: '2026-11-10T10:00:00.000Z', code },
      { addedAt: '2026-11-10T11:00:00.000Z', code: other },
    ])
    expect(removeCode(dataDir, code)).toBe(true)
    expect(removeCode(dataDir, code)).toBe(false)
    expect(readKeptList(dataDir).map((entry) => entry.code)).toEqual([other])
    expect(fs.readdirSync(dataDir)).toEqual(['kept.json'])
  })

  it('never reads a broken list as empty, which would drop every course', () => {
    const dataDir = path.join(root, 'broken')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'kept.json'), '{ not json')
    expect(() => readKeptList(dataDir)).toThrow()
    expect(() => addCode(dataDir, code)).toThrow()
  })
})
