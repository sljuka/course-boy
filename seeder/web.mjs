// The seeder's web page (SLJ-194): what it keeps, a box to add a code, Remove,
// and a short log, for people who run it from a home-server dashboard
// (Umbrel) rather than a terminal. Node's own `http` and a static page in
// seeder/web/, no framework and no dependency.
//
// It never shows or does more than the CLI: no course content, no publishing,
// no identity, no student names.
//
// Who can reach it:
// - It listens on localhost unless told otherwise (`host`).
// - Anywhere else it needs a password (HTTP Basic, any user name), unless
//   `open` says something in front of it already checks who's there (Umbrel's
//   app proxy and login). Without either it refuses to start, so it's never
//   on a network by accident.
// - Changes (add, remove) are POSTs of JSON with an `X-Matko-Seeder` header
//   and, when the browser sends one, an Origin matching the page: another
//   site can't make a visitor's browser send them (no simple-request CSRF).
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { addCode, codeFromInput, readKeptList, removeCode } from './kept-list.mjs'
import { diskOf } from './space.mjs'

const PAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web')
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.css': ['app.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
}
const MAX_BODY = 4096
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export function isLoopback(host) {
  return host === 'localhost' || host === '::1' || /^127\./.test(host)
}

// Equal in constant time, whatever the lengths.
function samePassword(given, expected) {
  const a = crypto.createHash('sha256').update(given).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

function passwordFrom(req) {
  const match = /^Basic\s+(.+)$/i.exec(req.headers.authorization ?? '')
  if (!match) return null
  const decoded = Buffer.from(match[1], 'base64').toString('utf8')
  const colon = decoded.indexOf(':')
  return colon === -1 ? null : decoded.slice(colon + 1)
}

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
// space). Resolves to
// { close, port } once listening.
export function startWebServer({ dataDir, host = '127.0.0.1', open = false, password = '', port, state }) {
  if (!isLoopback(host) && !password && !open) {
    throw new Error(
      `The web page would be reachable from other computers on ${host} without a password. ` +
        'Set MATKO_SEED_WEB_PASSWORD, or MATKO_SEED_WEB_OPEN=1 if something in front of it already checks who it is (as Umbrel does).',
    )
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (password && !samePassword(passwordFrom(req) ?? '', password)) {
        send(res, 401, { error: 'password' }, undefined, { 'WWW-Authenticate': 'Basic realm="Matko seeder", charset="UTF-8"' })
        return
      }
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
      if (!res.headersSent) send(res, error.status ?? 500, { error: error.status ? error.message : 'error' })
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
