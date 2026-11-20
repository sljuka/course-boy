// Accounts for the seeder's web page (SLJ-194): who may manage what a seeder
// keeps. The first account is the admin, made on the page's first visit (or
// with `cli.mjs add-user`); it adds and removes the others and resets their
// passwords, and is the only admin, so it can't be removed.
//
// <data>/accounts.json  { accounts: [{ name, admin, salt, hash, createdAt }] }
// <data>/sessions.json  { sessions: { <sha256 of the token>: { name, expiresAt } } }
//
// Passwords are kept as scrypt hashes, sessions by a hash of their token, so
// neither file holds anything a reader could sign in with. Both are written
// atomically (a temp file, then a rename) and readable by their owner only.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ACCOUNTS_FILE = 'accounts.json'
const SESSIONS_FILE = 'sessions.json'
export const MIN_PASSWORD_LENGTH = 8
export const MAX_NAME_LENGTH = 32
export const SESSION_DAYS = 30
const DAY_MS = 24 * 60 * 60_000
// A session's expiry is pushed back on use, at most once a day, so the page's
// polling doesn't rewrite the file every few seconds.
const RENEW_AFTER_MS = DAY_MS
const SCRYPT = { N: 16_384, p: 1, r: 8 }
const KEY_LENGTH = 64

// `code`: 'name' (empty or too long), 'password' (too short), 'taken',
// 'unknown' (no such account), 'admin' (the admin can't be removed).
export class AccountError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function readJson(dataDir, file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function writeJson(dataDir, file, value) {
  fs.mkdirSync(dataDir, { recursive: true })
  const target = path.join(dataDir, file)
  const temp = `${target}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, target)
}

function readAccounts(dataDir) {
  const parsed = readJson(dataDir, ACCOUNTS_FILE, { accounts: [] })
  if (!Array.isArray(parsed?.accounts)) throw new Error(`${path.join(dataDir, ACCOUNTS_FILE)} has no "accounts" list`)
  return parsed.accounts
}

const writeAccounts = (dataDir, accounts) => writeJson(dataDir, ACCOUNTS_FILE, { accounts })

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()

function findAccount(accounts, name) {
  return accounts.find((account) => sameName(account.name, String(name ?? '')))
}

function checkedName(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed || [...trimmed].length > MAX_NAME_LENGTH) {
    throw new AccountError('name', `A name is 1 to ${MAX_NAME_LENGTH} characters.`)
  }
  return trimmed
}

function checkedPassword(password) {
  if (typeof password !== 'string' || [...password].length < MIN_PASSWORD_LENGTH) {
    throw new AccountError('password', `A password is at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  return password
}

function hashPassword(password, salt = crypto.randomBytes(16)) {
  return { hash: crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT).toString('base64'), salt: salt.toString('base64') }
}

export function hasAccounts(dataDir) {
  return readAccounts(dataDir).length > 0
}

// [{ name, admin, createdAt }]: never the hashes.
export function listAccounts(dataDir) {
  return readAccounts(dataDir).map(({ admin, createdAt, name }) => ({ admin: Boolean(admin), createdAt, name }))
}

// Adds an account; the first one is the admin. Resolves to { name, admin }.
export function createAccount(dataDir, { name, password }, now = new Date()) {
  const accounts = readAccounts(dataDir)
  const checked = checkedName(name)
  if (findAccount(accounts, checked)) throw new AccountError('taken', `There's already an account named "${checked}".`)
  const admin = accounts.length === 0
  writeAccounts(dataDir, [...accounts, { admin, createdAt: now.toISOString(), name: checked, ...hashPassword(checkedPassword(password)) }])
  return { admin, name: checked }
}

// The account { name, admin } if the password is its own, else null. A name
// with no account is hashed against anyway, so the answer takes as long.
export function checkPassword(dataDir, name, password) {
  const account = findAccount(readAccounts(dataDir), name)
  const salt = account ? Buffer.from(account.salt, 'base64') : Buffer.alloc(16)
  const given = crypto.scryptSync(String(password ?? ''), salt, KEY_LENGTH, SCRYPT)
  const expected = account ? Buffer.from(account.hash, 'base64') : Buffer.alloc(KEY_LENGTH)
  if (!account || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  return { admin: Boolean(account.admin), name: account.name }
}

// A new password for an account; its sessions end (it's signed out everywhere).
export function setPassword(dataDir, name, password) {
  const accounts = readAccounts(dataDir)
  const account = findAccount(accounts, name)
  if (!account) throw new AccountError('unknown', `There's no account named "${name}".`)
  Object.assign(account, hashPassword(checkedPassword(password)))
  writeAccounts(dataDir, accounts)
  endSessionsOf(dataDir, account.name)
}

// Removes an account and ends its sessions. Never the admin.
export function removeAccount(dataDir, name) {
  const accounts = readAccounts(dataDir)
  const account = findAccount(accounts, name)
  if (!account) throw new AccountError('unknown', `There's no account named "${name}".`)
  if (account.admin) throw new AccountError('admin', "The admin account can't be removed.")
  writeAccounts(dataDir, accounts.filter((other) => other !== account))
  endSessionsOf(dataDir, account.name)
}

const tokenKey = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

function readSessions(dataDir) {
  const parsed = readJson(dataDir, SESSIONS_FILE, { sessions: {} })
  return parsed && typeof parsed.sessions === 'object' && parsed.sessions !== null ? parsed.sessions : {}
}

const writeSessions = (dataDir, sessions) => writeJson(dataDir, SESSIONS_FILE, { sessions })

// A new session for an account: its token, for the cookie.
export function createSession(dataDir, name, now = new Date()) {
  const token = crypto.randomBytes(32).toString('base64url')
  const sessions = readSessions(dataDir)
  // Expired ones are dropped whenever one is made.
  for (const [key, session] of Object.entries(sessions)) if (Date.parse(session.expiresAt) <= now.getTime()) delete sessions[key]
  sessions[tokenKey(token)] = { expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS).toISOString(), name, renewedAt: now.toISOString() }
  writeSessions(dataDir, sessions)
  return token
}

// The account { name, admin } a session token belongs to, or null (unknown,
// expired, or its account removed). Pushes the expiry back.
export function sessionAccount(dataDir, token, now = new Date()) {
  if (!token) return null
  const sessions = readSessions(dataDir)
  const key = tokenKey(token)
  const session = sessions[key]
  if (!session || Date.parse(session.expiresAt) <= now.getTime()) return null
  const account = findAccount(readAccounts(dataDir), session.name)
  if (!account) return null
  if (now.getTime() - Date.parse(session.renewedAt ?? 0) >= RENEW_AFTER_MS) {
    sessions[key] = { ...session, expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS).toISOString(), renewedAt: now.toISOString() }
    writeSessions(dataDir, sessions)
  }
  return { admin: Boolean(account.admin), name: account.name }
}

export function endSession(dataDir, token) {
  if (!token) return
  const sessions = readSessions(dataDir)
  const key = tokenKey(token)
  if (!sessions[key]) return
  delete sessions[key]
  writeSessions(dataDir, sessions)
}

function endSessionsOf(dataDir, name) {
  const sessions = readSessions(dataDir)
  let changed = false
  for (const [key, session] of Object.entries(sessions)) {
    if (sameName(session.name, name)) {
      delete sessions[key]
      changed = true
    }
  }
  if (changed) writeSessions(dataDir, sessions)
}
