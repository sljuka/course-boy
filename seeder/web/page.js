// Small helpers the page's parts share (SLJ-194): making elements, calling the
// seeder's API, and saying something under a form.
import { t } from './text.js'

export function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

// Told when the API says the visitor isn't signed in (any more): the session
// ran out, or their account was removed or its password reset.
let onSignedOut = () => {}
export function whenSignedOut(callback) {
  onSignedOut = callback
}

function handle(response, body) {
  if (response.status === 401 && body.error === 'signed-out') onSignedOut()
  return { body, ok: response.ok, status: response.status }
}

export async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' })
  return handle(response, await response.json().catch(() => ({})))
}

// Every change is a JSON POST with the page's header (see web.mjs).
export async function post(path, body = {}) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Matko-Seeder': '1' },
    method: 'POST',
  })
  return handle(response, await response.json().catch(() => ({})))
}

// A message under a form, by its text key; `bad` in red. No key clears it.
export function say(node, key, { bad = false, values = {} } = {}) {
  node.textContent = key ? t(key, values) : ''
  node.className = `message${bad ? ' bad' : ''}`
}

// What an account call's error means, as a text key.
export function accountErrorKey({ body, status }) {
  if (status === 429) return 'wait'
  return { name: 'badName', password: 'badPassword', taken: 'taken', wrong: 'wrong' }[body.error] ?? 'failed'
}
