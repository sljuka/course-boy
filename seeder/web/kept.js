// What the seeder keeps (SLJ-194): the summary, the list with Remove, the box
// to add a code, and the recent log. Polls /api/state while shown.
import { element, getJson, post, say as sayUnder } from './page.js'
import { bytes, currentLanguage, shortCode, t, when } from './text.js'

// The seeder's last report, from /api/state.
let latest = null
// The code the "Added" message is about: the message goes once the seeder has
// found it on the network, since its row then says the rest.
let addedCode = null
let timer = null

function describe(entry, code) {
  if (!entry) {
    const isWaitingForSpace = latest?.waiting?.includes(code)
    return { name: '', state: t(isWaitingForSpace ? 'waitingSpace' : 'waiting'), stateClass: isWaitingForSpace ? 'error' : 'fetching' }
  }
  const name = entry.title ?? shortCode(entry.driveKey)
  const kind = entry.kind ? t(`kind.${entry.kind}`) : t('lookingUp')
  const state =
    entry.state === 'kept'
      ? t('keptState', { when: when(entry.kept?.keptAt) })
      : entry.state === 'error'
        ? t('error', { error: entry.error ?? '' })
        : entry.fetchingVersion
          ? t('fetchingVersion', { version: entry.fetchingVersion })
          : t('fetching')
  // A newer version downloading while the one above stays online.
  const updating = entry.state === 'kept' && entry.fetchingVersion ? t('updating', { version: entry.fetchingVersion }) : null
  return { kind, name, state, stateClass: entry.state ?? 'fetching', updating }
}

function keptItem(entry, { code, listedFor }) {
  const item = element('li', listedFor ? 'listed' : '')
  item.dataset.code = code
  const { kind, name, state, stateClass, updating } = describe(entry, code)
  const top = element('div', 'row')
  const heading = element('span', 'heading')
  heading.append(element('span', 'name', name || shortCode(code)))
  // The version held in full: what students get from this box now.
  if (entry?.version) heading.append(element('span', 'version', t('version', { version: entry.version })))
  top.append(heading)
  if (!listedFor) {
    const remove = element('button', 'quiet', t('remove'))
    remove.type = 'button'
    remove.addEventListener('click', () => removeCode(code, name || shortCode(code)))
    top.append(remove)
  }
  item.append(top)
  const parts = [kind, listedFor ? t('listedBy', { name: listedFor }) : null, entry ? t('peers', { count: entry.peers ?? 0 }) : null].filter(Boolean)
  const meta = element('div', 'meta')
  meta.append(element('span', `state-${stateClass}`, state))
  if (updating) meta.append(document.createTextNode(' · '), element('span', 'state-fetching', updating))
  meta.append(document.createTextNode(parts.length ? ` · ${parts.join(' · ')}` : ''))
  item.append(meta)
  return item
}

export function renderKept() {
  if (!latest) return

  const summary = document.getElementById('summary')
  summary.replaceChildren(
    element('span', `dot${latest.running ? ' on' : ''}`),
    document.createTextNode(
      [
        latest.running ? t('online') : t('notRunning'),
        t('keptCount', { count: latest.kept.filter((entry) => entry.state === 'kept').length }),
        latest.space
          ? t(latest.space.maxStore ? 'usedOf' : 'used', { max: bytes(latest.space.maxStore), used: bytes(latest.space.storeBytes) })
          : null,
        latest.disk ? t('disk', { free: bytes(latest.disk.free), total: bytes(latest.disk.total) }) : null,
      ]
        .filter(Boolean)
        .join(' · '),
    ),
  )
  renderSpace(latest.space)

  const byCode = new Map(latest.kept.map((entry) => [entry.driveKey, entry]))
  const list = document.getElementById('kept')
  const items = []
  const shown = new Set()
  const addListed = (parentCode, parentName) => {
    for (const entry of latest.kept) {
      if (entry.via !== parentCode || shown.has(entry.driveKey)) continue
      shown.add(entry.driveKey)
      items.push(keptItem(entry, { code: entry.driveKey, listedFor: parentName }))
      addListed(entry.driveKey, entry.title ?? shortCode(entry.driveKey))
    }
  }
  for (const { code } of latest.added) {
    shown.add(code)
    const entry = byCode.get(code)
    items.push(keptItem(entry, { code }))
    addListed(code, entry?.title ?? shortCode(code))
  }
  list.replaceChildren(...items)
  document.getElementById('empty').hidden = latest.added.length > 0
  if (addedCode && byCode.get(addedCode)?.title) say('')

  const recent = document.getElementById('recent')
  recent.replaceChildren(
    ...[...latest.recent].reverse().map(({ at, line }) => {
      const item = element('li')
      const time = element('time', '', new Date(at).toLocaleTimeString(currentLanguage(), { hour: '2-digit', minute: '2-digit' }))
      time.dateTime = at
      item.append(time, document.createTextNode(line))
      return item
    }),
  )
}

// Full (new codes wait) or getting there: said above the list, in words.
function renderSpace(space) {
  const node = document.getElementById('space')
  const values = { free: bytes(space?.free), max: bytes(space?.maxStore), used: bytes(space?.storeBytes) }
  const key = !space
    ? null
    : space.full === 'cap'
      ? 'spaceCapFull'
      : space.full === 'disk'
        ? 'spaceDiskFull'
        : space.low
          ? space.maxStore && space.storeBytes >= space.maxStore * 0.9
            ? 'spaceCapLow'
            : 'spaceDiskLow'
          : null
  node.hidden = key === null
  node.textContent = key ? t(key, values) : ''
  node.className = `message${space?.full ? ' bad' : ''}`
}

function say(key, bad = false, code = null) {
  addedCode = key === 'added' ? code : null
  sayUnder(document.getElementById('message'), key, { bad })
}

async function refresh() {
  try {
    const { body, ok, status } = await getJson('api/state')
    if (status === 401) return
    if (!ok) throw new Error(String(status))
    latest = body
  } catch {
    if (latest) latest = { ...latest, running: false }
  }
  renderKept()
}

async function removeCode(code, name) {
  if (!window.confirm(t('confirmRemove', { name }))) return
  try {
    const { ok } = await post('api/remove', { code })
    say(ok ? 'removed' : 'failed', !ok)
  } catch {
    say('failed', true)
  }
  await refresh()
}

async function addFromForm(event) {
  event.preventDefault()
  const input = document.getElementById('code')
  try {
    const { body, ok } = await post('api/add', { code: input.value })
    if (!ok) {
      say(body.error === 'invalid' ? 'invalid' : 'failed', true)
      return
    }
    say(body.changed ? 'added' : 'already', false, body.code ?? null)
    if (body.changed) input.value = ''
  } catch {
    say('failed', true)
  }
  await refresh()
}

document.getElementById('add').addEventListener('submit', addFromForm)

// Starts polling the seeder (again), for a visitor who may use the page.
export function startKept() {
  if (timer) return
  void refresh()
  timer = setInterval(refresh, 3000)
}

// Stops polling and forgets the last report: the visitor signed out.
export function stopKept() {
  clearInterval(timer)
  timer = null
  latest = null
  say('')
}
