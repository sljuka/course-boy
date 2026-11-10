import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import createTestnet from 'hyperdht/testnet.js'
import protocol from './protocol.json' with { type: 'json' }
import { startWorker } from './worker-client.mjs'

// SLJ-144 step 3: the host's side of the worker, shared by the app's main
// process and the headless seeder, and the RPC numbers both sides share.
const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.join(here, '..')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-worker-client-'))

afterAll(() => fs.rmSync(root, { force: true, recursive: true }))

describe('the RPC protocol (workers/protocol.json)', () => {
  it('names every command and event the worker and the app use, each number once', () => {
    const numbers = [...Object.values(protocol.commands), ...Object.values(protocol.events)]
    expect(new Set(numbers).size).toBe(numbers.length)

    for (const file of ['workers/main.cjs', 'electron/bare-worker.ts']) {
      const source = fs.readFileSync(path.join(repo, file), 'utf8')
      const used = [...source.matchAll(/\b(CMD|EVENT)\.([A-Z][A-Z_]*)\b/g)]
      expect(used.length).toBeGreaterThan(0)
      for (const [, kind, name] of used) {
        expect((kind === 'CMD' ? protocol.commands : protocol.events)[name], `${file}: ${kind}.${name}`).toBeTypeOf('number')
      }
      // No number written out by hand any more.
      expect(source).not.toMatch(/\b(CMD|EVENT)_[A-Z_]+ = \d+/)
    }
  })
})

describe('the worker client (workers/worker-client.mjs)', () => {
  it('starts the worker, gets raw and JSON replies and its errors, and stops it', async () => {
    // A local DHT: the worker joins it at start, never the public network.
    const testnet = await createTestnet(3)
    const bootstrap = testnet.bootstrap.map(({ host, port }) => `${host}:${port}`).join(',')
    const stderr = []
    const worker = startWorker({
      args: [path.join(root, 'store'), bootstrap],
      onStderr: (text) => stderr.push(text),
      workerPath: path.join(here, 'main.cjs'),
    })
    try {
      // Locked (no identity handed over): an empty publisher id.
      await expect(worker.requestRaw(protocol.commands.GET_CREATOR_KEY)).resolves.toBe('')
      await expect(worker.request(protocol.commands.LIST_KEPT_DRIVES, {})).resolves.toEqual({ kept: [] })
      // The worker's own error comes back as a thrown Error it answered with.
      const error = await worker.request(protocol.commands.FOLLOW_COURSE, { driveKey: 'not a key' }).catch((caught) => caught)
      expect(error).toBeInstanceOf(Error)
      expect(error.fromWorker).toBe(true)
    } finally {
      await worker.stop()
      await testnet.destroy()
    }
    await expect(worker.requestRaw(protocol.commands.GET_CREATOR_KEY)).rejects.toThrow('Bare worker is not running')
  }, 30_000)
})
