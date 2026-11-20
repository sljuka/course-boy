import { afterAll, afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createAccount } from './accounts.mjs'
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

// The session cookie a sign-in answered with, to send back.
const cookieOf = (response) => response.headers.get('set-cookie')?.split(';')[0] ?? ''
const session = async (base, cookie = '') => (await fetch(`${base}/api/session`, { headers: { Cookie: cookie } })).json()

// This computer's address on a network, to be a visitor from elsewhere; null
// without one.
const networkAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((entry) => entry && entry.family === 'IPv4' && !entry.internal)?.address ?? null

describe('the seeder web page (seeder/web.mjs)', () => {
  it('tells localhost apart', () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('0.0.0.0')).toBe(false)
  })

  it('serves the page with a strict content security policy, and the state', async () => {
    const { base } = await start()
    const page = await fetch(`${base}/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('content-security-policy')).toContain("script-src 'self'")
    expect(await page.text()).toContain('<script type="module" src="app.js"')
    for (const file of ['account.js', 'kept.js', 'page.js', 'text.js']) {
      expect((await fetch(`${base}/${file}`)).headers.get('content-type')).toMatch(/javascript/)
    }
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

})

describe('accounts on the seeder web page (SLJ-194)', () => {
  it('on localhost with no account, needs no sign-in, and offers no setup', async () => {
    const { base } = await start()
    expect(await session(base)).toEqual({ admin: false, mode: 'open', name: null })
    expect((await change(base, 'setup', { name: 'Ana', password: 'correct horse' })).status).toBe(403)
  })

  it('on a network with no account, the first visitor makes the admin, once, and is signed in', async () => {
    const { base, dataDir } = await start({ host: '0.0.0.0' })
    expect(await session(base)).toMatchObject({ mode: 'setup' })
    expect((await fetch(`${base}/api/state`)).status).toBe(401)
    expect((await change(base, 'setup', { name: 'Ana', password: 'short' })).status).toBe(400)

    const made = await change(base, 'setup', { name: 'Ana', password: 'correct horse' })
    expect(await made.json()).toEqual({ name: 'Ana' })
    const cookie = cookieOf(made)
    expect(made.headers.get('set-cookie')).toMatch(/HttpOnly; SameSite=Strict; Path=\//)
    expect(await session(base, cookie)).toEqual({ admin: true, mode: 'signed-in', name: 'Ana' })
    expect((await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).status).toBe(200)

    // Taken: nobody else can set it up again.
    expect(await session(base)).toMatchObject({ mode: 'login' })
    expect((await change(base, 'setup', { name: 'Eve', password: 'correct horse' })).status).toBe(403)
    expect(fs.existsSync(path.join(dataDir, 'accounts.json'))).toBe(true)
  })

  it.skipIf(!networkAddress)('on a network, a visitor from elsewhere can make the admin only with setupOpen', async () => {
    const elsewhere = async (setupOpen) => {
      const { base } = await start({ host: '0.0.0.0', setupOpen })
      const remote = base.replace('127.0.0.1', networkAddress)
      const result = { mode: (await session(remote)).mode, setup: (await change(remote, 'setup', { name: 'Eve', password: 'correct horse' })).status }
      await server.close()
      server = null
      return result
    }
    expect(await elsewhere(false)).toEqual({ mode: 'setup-elsewhere', setup: 403 })
    expect(await elsewhere(true)).toEqual({ mode: 'setup', setup: 200 })
  })

  it('once an account exists, asks everyone to sign in, localhost too, and signs out', async () => {
    const { base, dataDir } = await start()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    expect(await session(base)).toMatchObject({ mode: 'login' })
    expect((await fetch(`${base}/api/state`)).status).toBe(401)
    expect((await change(base, 'add', { code })).status).toBe(401)

    expect((await change(base, 'login', { name: 'ana', password: 'wrong horse' })).status).toBe(401)
    const signedIn = await change(base, 'login', { name: 'ana', password: 'correct horse' })
    expect(await signedIn.json()).toEqual({ name: 'Ana' })
    const cookie = cookieOf(signedIn)
    expect((await change(base, 'add', { code }, { Cookie: cookie })).status).toBe(200)

    const out = await change(base, 'logout', {}, { Cookie: cookie })
    expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0/)
    expect((await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).status).toBe(401)
  })

  it('waits a minute after five wrong passwords from one address', async () => {
    const { base, dataDir } = await start()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    for (let i = 0; i < 5; i++) expect((await change(base, 'login', { name: 'Ana', password: `wrong ${i}` })).status).toBe(401)
    expect((await change(base, 'login', { name: 'Ana', password: 'correct horse' })).status).toBe(429)
  })

  it('lets the admin add, reset and remove accounts, but never remove the admin; others may not', async () => {
    const { base, dataDir } = await start()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    const admin = cookieOf(await change(base, 'login', { name: 'Ana', password: 'correct horse' }))
    const asAdmin = (action, body) => change(base, `accounts/${action}`, body, { Cookie: admin })

    expect(await (await asAdmin('add', { name: 'Marko', password: 'battery staple' })).json()).toMatchObject({
      accounts: [expect.objectContaining({ admin: true, name: 'Ana' }), expect.objectContaining({ admin: false, name: 'Marko' })],
    })
    expect((await asAdmin('add', { name: 'marko', password: 'battery staple' })).status).toBe(400)
    const listed = await (await fetch(`${base}/api/accounts`, { headers: { Cookie: admin } })).json()
    expect(JSON.stringify(listed)).not.toMatch(/hash|salt/)

    const marko = cookieOf(await change(base, 'login', { name: 'Marko', password: 'battery staple' }))
    expect(await session(base, marko)).toEqual({ admin: false, mode: 'signed-in', name: 'Marko' })
    expect((await fetch(`${base}/api/accounts`, { headers: { Cookie: marko } })).status).toBe(403)
    expect((await change(base, 'accounts/remove', { name: 'Ana' }, { Cookie: marko })).status).toBe(403)

    // A reset signs Marko out; so does removing him.
    expect((await asAdmin('reset', { name: 'Marko', password: 'new staple!' })).status).toBe(200)
    expect(await session(base, marko)).toMatchObject({ mode: 'login' })
    const again = cookieOf(await change(base, 'login', { name: 'Marko', password: 'new staple!' }))
    expect((await asAdmin('remove', { name: 'Marko' })).status).toBe(200)
    expect((await fetch(`${base}/api/state`, { headers: { Cookie: again } })).status).toBe(401)

    expect(await (await asAdmin('remove', { name: 'Ana' })).json()).toEqual({ error: 'admin' })
  })

  it('changes your own password with the current one, and keeps you signed in', async () => {
    const { base, dataDir } = await start()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    const cookie = cookieOf(await change(base, 'login', { name: 'Ana', password: 'correct horse' }))
    expect((await change(base, 'password', { current: 'wrong horse', password: 'new horse!' }, { Cookie: cookie })).status).toBe(401)
    const changed = await change(base, 'password', { current: 'correct horse', password: 'new horse!' }, { Cookie: cookie })
    expect(changed.status).toBe(200)
    expect(await session(base, cookieOf(changed))).toMatchObject({ mode: 'signed-in', name: 'Ana' })
    expect(await session(base, cookie)).toMatchObject({ mode: 'login' })
  })

  it("won't sign in or change accounts for another site", async () => {
    const { base, dataDir } = await start()
    createAccount(dataDir, { name: 'Ana', password: 'correct horse' })
    expect((await change(base, 'login', { name: 'Ana', password: 'correct horse' }, { Origin: 'https://evil.example' })).status).toBe(403)
    const cookie = cookieOf(await change(base, 'login', { name: 'Ana', password: 'correct horse' }))
    expect((await change(base, 'accounts/add', { name: 'Eve', password: 'correct horse' }, { Cookie: cookie, 'X-Matko-Seeder': '' })).status).toBe(403)
  })
})
