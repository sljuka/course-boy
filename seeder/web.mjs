// The seeder's web page (SLJ-194): what it keeps, a box to add a code, Remove,
// and a short log, for people who run it from a home-server dashboard
// (Umbrel) rather than a terminal. Node's own `http` and a static page in
// seeder/web/, no framework and no dependency.
//
// It never shows or does more than the CLI: no course content, no publishing,
// no identity, no student names.
//
// Who can use it (accounts.mjs keeps the accounts; the first is the admin):
// - `open`: anyone who reaches it, since something in front of it already
//   checks who's there (a reverse proxy with its own login). No accounts.
// - Once an account exists: whoever signs in, wherever the page listens.
// - Before that, on localhost only (`host`, the default): anyone on this
//   computer, as before accounts; they can be made with `cli.mjs add-user`.
// - Before that, on a network: the first-run screen, to make the admin
//   account, for a visitor on this computer, or for anyone with `setupOpen`
//   (the Umbrel app: its owner opens it right after installing, as with
//   Jellyfin). Anyone else is told to make it with `cli.mjs add-user`, so a
//   seeder on a server can't be claimed by whoever finds it first.
// - Every POST is JSON with an `X-Matko-Seeder` header and, when the browser
//   sends one, an Origin matching the page: another site can't make a
//   visitor's browser send it (no simple-request CSRF). The session cookie is
//   SameSite=Strict and HttpOnly.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AccountError,
  checkPassword,
  createAccount,
  createSession,
  endSession,
  hasAccounts,
  listAccounts,
  removeAccount,
  SESSION_DAYS,
  sessionAccount,
  setPassword,
} from './accounts.mjs'
import { addCode, codeFromInput, readKeptList, removeCode } from './kept-list.mjs'
import { diskOf } from './space.mjs'

const PAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web')
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/account.js': ['account.js', 'text/javascript; charset=utf-8'],
  '/app.css': ['app.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/kept.js': ['kept.js', 'text/javascript; charset=utf-8'],
  '/page.js': ['page.js', 'text/javascript; charset=utf-8'],
  '/text.js': ['text.js', 'text/javascript; charset=utf-8'],
}
const COOKIE = 'matko_seeder_session'
// Sign-in attempts: after this many wrong ones from one address, it waits.
const MAX_FAILURES = 5
const LOCKOUT_MS = 60_000
const MAX_BODY = 4096
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export function isLoopback(host) {
  return host === 'localhost' || host === '::1' || /^127\./.test(host)
}

// A visitor on this computer (IPv4, IPv6, or IPv4 inside IPv6).
function isLocalVisitor(req) {
  const address = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '')
  return isLoopback(address)
}

function tokenFrom(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE) return value.join('=')
  }
  return null
}

const sessionCookie = (token) =>
  `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
const clearedCookie = `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': type, ...SECURITY_HEADERS, ...extra })
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body)
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw Object.assign(new Error('too large'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw Object.assign(new Error('not JSON'), { status: 400 })
  }
}

// A change must come from the page itself.
function isFromPage(req) {
  if (req.headers['x-matko-seeder'] !== '1') return false
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

// `state()`: { kept, recent, running, space, waiting } from the running
// seeder (space: space.mjs's `spaceState`; waiting: codes waiting for
// space). `setupOpen`: anyone may make the first account (see above).
// Resolves to { close, port } once listening.
export function startWebServer({ dataDir, host = '127.0.0.1', open = false, port, setupOpen = false, state }) {
  // address -> { failures, until }: wrong sign-ins, kept in memory.
  const failures = new Map()

  // Who the visitor is: { mode, account }. `mode`: 'open' (no sign-in
  // needed), 'signed-in', 'login', 'setup' (may make the first account) or
  // 'setup-elsewhere' (must make it with the CLI).
  function visitor(req) {
    if (open) return { account: null, mode: 'open' }
    if (hasAccounts(dataDir)) {
      const account = sessionAccount(dataDir, tokenFrom(req))
      return { account, mode: account ? 'signed-in' : 'login' }
    }
    if (isLoopback(host)) return { account: null, mode: 'open' }
    return { account: null, mode: setupOpen || isLocalVisitor(req) ? 'setup' : 'setup-elsewhere' }
  }

  function blocked(req) {
    const entry = failures.get(req.socket.remoteAddress)
    return Boolean(entry && entry.until > Date.now())
  }

  function failed(req) {
    const address = req.socket.remoteAddress
    const entry = failures.get(address) ?? { failures: 0, until: 0 }
    entry.failures += 1
    if (entry.failures >= MAX_FAILURES) {
      entry.failures = 0
      entry.until = Date.now() + LOCKOUT_MS
    }
    failures.set(address, entry)
  }

  function signIn(res, name) {
    send(res, 200, { name }, undefined, { 'Set-Cookie': sessionCookie(createSession(dataDir, name)) })
  }

  // The account calls: signing in and out, and managing accounts.
  async function handleAccountApi(req, res, url, who) {
    if (req.method === 'GET' && url.pathname === '/api/session') {
      send(res, 200, { admin: Boolean(who.account?.admin), mode: who.mode, name: who.account?.name ?? null })
      return true
    }
    if (req.method !== 'POST' && !(req.method === 'GET' && url.pathname === '/api/accounts')) return false
    if (req.method === 'POST' && !isFromPage(req)) {
      send(res, 403, { error: 'forbidden' })
      return true
    }
    switch (url.pathname) {
      case '/api/setup': {
        if (who.mode !== 'setup') {
          send(res, 403, { error: 'forbidden' })
          return true
        }
        const { name, password } = await readJson(req)
        signIn(res, createAccount(dataDir, { name, password }).name)
        return true
      }
      case '/api/login': {
        if (who.mode !== 'login' && who.mode !== 'signed-in') {
          send(res, 403, { error: 'forbidden' })
          return true
        }
        if (blocked(req)) {
          send(res, 429, { error: 'wait' })
          return true
        }
        const { name, password } = await readJson(req)
        const account = checkPassword(dataDir, name, password)
        if (!account) {
          failed(req)
          send(res, 401, { error: 'wrong' })
          return true
        }
        failures.delete(req.socket.remoteAddress)
        signIn(res, account.name)
        return true
      }
      case '/api/logout':
        endSession(dataDir, tokenFrom(req))
        send(res, 200, {}, undefined, { 'Set-Cookie': clearedCookie })
        return true
    }
    if (!['/api/password', '/api/accounts', '/api/accounts/add', '/api/accounts/remove', '/api/accounts/reset'].includes(url.pathname)) return false
    if (!who.account) {
      send(res, 401, { error: 'signed-out' })
      return true
    }
    if (url.pathname === '/api/password') {
      const { current, password } = await readJson(req)
      if (blocked(req)) {
        send(res, 429, { error: 'wait' })
        return true
      }
      if (!checkPassword(dataDir, who.account.name, current)) {
        failed(req)
        send(res, 401, { error: 'wrong' })
        return true
      }
      setPassword(dataDir, who.account.name, password)
      // Every session ended with the change: this one goes on.
      signIn(res, who.account.name)
      return true
    }
    if (!who.account.admin) {
      send(res, 403, { error: 'admin' })
      return true
    }
    if (req.method === 'GET') {
      send(res, 200, { accounts: listAccounts(dataDir) })
      return true
    }
    const { name, password } = await readJson(req)
    if (url.pathname === '/api/accounts/add') createAccount(dataDir, { name, password })
    else if (url.pathname === '/api/accounts/remove') removeAccount(dataDir, name)
    else setPassword(dataDir, name, password)
    send(res, 200, { accounts: listAccounts(dataDir) })
    return true
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://seeder')

      if (req.method === 'GET' && FILES[url.pathname]) {
        const [file, type] = FILES[url.pathname]
        send(res, 200, fs.readFileSync(path.join(PAGE_DIR, file)), type)
        return
      }

      // No icon: answered, so browsers don't log a missing one.
      if (req.method === 'GET' && url.pathname === '/favicon.ico') {
        res.writeHead(204, SECURITY_HEADERS)
        res.end()
        return
      }

      const who = visitor(req)
      if (await handleAccountApi(req, res, url, who)) return
      // What's kept, and changing it: only for whoever may use the page.
      if (url.pathname.startsWith('/api/') && who.mode !== 'open' && who.mode !== 'signed-in') {
        send(res, 401, { error: 'signed-out' })
        return
      }

      if (req.method === 'GET' && url.pathname === '/api/state') {
        const { kept, recent, running, space = null, waiting = [] } = state()
        let added = []
        try {
          added = readKeptList(dataDir)
        } catch (error) {
          send(res, 500, { error: error.message })
          return
        }
        send(res, 200, { added, disk: diskOf(dataDir), kept, recent, running, space, waiting })
        return
      }

      if (req.method === 'POST' && (url.pathname === '/api/add' || url.pathname === '/api/remove')) {
        if (!isFromPage(req)) {
          send(res, 403, { error: 'forbidden' })
          return
        }
        const body = await readJson(req)
        const code = codeFromInput(body.code)
        if (!code) {
          send(res, 400, { error: 'invalid' })
          return
        }
        const changed = url.pathname === '/api/add' ? addCode(dataDir, code) : removeCode(dataDir, code)
        send(res, 200, { changed, code })
        return
      }

      send(res, 404, { error: 'not found' })
    } catch (error) {
      if (res.headersSent) return
      if (error instanceof AccountError) send(res, 400, { error: error.code })
      else send(res, error.status ?? 500, { error: error.status ? error.message : 'error' })
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)
      resolve({
        close: () => new Promise((done) => server.close(() => done())),
        port: server.address().port,
      })
    })
  })
}
