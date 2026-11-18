import { afterAll, afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readKeptList } from './kept-list.mjs'
import { isLoopback, startWebServer } from './web.mjs'

// SLJ-194: the seeder's web page and its small API.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-seeder-web-'))
afterAll(() => fs.rmSync(root, { force: true, recursive: true }))

const code = 'fwy8xnz8ejdswp6aukomadwpeitpspbgotbm3c8zk4mzsxrhyk1y'
const kept = [{ driveKey: code, kind: 'course', peers: 2, state: 'kept', title: 'A course', via: null }]
const recent = [{ at: '2026-11-17T10:00:00.000Z', line: 'kept course "A course" 0.1' }]

let server = null
afterEach(async () => {
  await server?.close()
  server = null
})

async function start(options = {}) {
  const dataDir = fs.mkdtempSync(path.join(root, 'data-'))
  server = await startWebServer({ dataDir, port: 0, state: () => ({ kept, recent, running: true }), ...options })
  return { base: `http://127.0.0.1:${server.port}`, dataDir }
}

const change = (base, action, body, headers = {}) =>
  fetch(`${base}/api/${action}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Matko-Seeder': '1', ...headers },
    method: 'POST',
  })

describe('the seeder web page (seeder/web.mjs)', () => {
  it('never listens beyond this computer without a password, unless told something else checks', async () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('0.0.0.0')).toBe(false)
    expect(() => startWebServer({ dataDir: root, host: '0.0.0.0', port: 0, state: () => ({}) })).toThrow(/without a password/)
    server = await startWebServer({ dataDir: root, host: '0.0.0.0', open: true, port: 0, state: () => ({ kept: [], recent: [], running: true }) })
    expect(server.port).toBeGreaterThan(0)
  })

  it('serves the page with a strict content security policy, and the state', async () => {
    const { base } = await start()
    const page = await fetch(`${base}/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('content-security-policy')).toContain("script-src 'self'")
    expect(await page.text()).toContain('<script src="app.js"')
    expect((await fetch(`${base}/app.js`)).headers.get('content-type')).toMatch(/javascript/)

    const state = await (await fetch(`${base}/api/state`)).json()
    expect(state).toMatchObject({ added: [], kept, recent, running: true })
    expect(state.disk.total).toBeGreaterThan(0)
    expect(state).toMatchObject({ space: null, waiting: [] })
    expect((await fetch(`${base}/../package.json`)).status).toBe(404)
  })

  it('passes on what the seeder says about space, and the codes waiting for it', async () => {
    const space = { free: 100, full: 'cap', low: false, maxStore: 1000, minFree: 10, storeBytes: 1000, total: 5000 }
    const { base } = await start({ state: () => ({ kept, recent, running: true, space, waiting: [code] }) })

    expect(await (await fetch(`${base}/api/state`)).json()).toMatchObject({ space, waiting: [code] })
  })

  it('adds and removes a code or link, and refuses anything else', async () => {
    const { base, dataDir } = await start()
    expect(await (await change(base, 'add', { code: `matko://import/${code}` })).json()).toEqual({ changed: true, code })
    expect(await (await change(base, 'add', { code })).json()).toEqual({ changed: false, code })
    expect(readKeptList(dataDir).map((entry) => entry.code)).toEqual([code])
    expect((await change(base, 'add', { code: 'not a code' })).status).toBe(400)
    expect(await (await change(base, 'remove', { code })).json()).toEqual({ changed: true, code })
    expect(readKeptList(dataDir)).toEqual([])
  })

  it("won't change anything for another site, or without the page's header", async () => {
    const { base, dataDir } = await start()
    expect((await change(base, 'add', { code }, { Origin: 'https://evil.example' })).status).toBe(403)
    expect((await change(base, 'add', { code }, { 'X-Matko-Seeder': '' })).status).toBe(403)
    // A form post (no JSON, no header) is what another site could send.
    const form = await fetch(`${base}/api/add`, { body: `code=${code}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, method: 'POST' })
    expect(form.status).toBe(403)
    expect(readKeptList(dataDir)).toEqual([])
  })

  it('asks for the password when it has one', async () => {
    const { base } = await start({ password: 'open sesame' })
    const denied = await fetch(`${base}/api/state`)
    expect(denied.status).toBe(401)
    expect(denied.headers.get('www-authenticate')).toMatch(/^Basic /)
    const wrong = await fetch(`${base}/api/state`, { headers: { Authorization: `Basic ${btoa('x:nope')}` } })
    expect(wrong.status).toBe(401)
    const right = await fetch(`${base}/api/state`, { headers: { Authorization: `Basic ${btoa('anyone:open sesame')}` } })
    expect(right.status).toBe(200)
  })
})
