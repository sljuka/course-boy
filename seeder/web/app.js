// The seeder's page (SLJ-194): polls /api/state and renders it; adds and
// removes through /api/add and /api/remove. English and Serbian; the Cyrillic
// text is made from the Latin one, so the two never drift apart.
'use strict'

const TEXT = {
  en: {
    addButton: 'Keep it',
    addHint: 'A channel or program also keeps every course it lists, including ones added later.',
    addLabel: 'Course, program or channel code or link',
    added: 'Added. It shows below once it’s found on the network.',
    already: 'That’s already on the list.',
    confirmRemove: 'Stop keeping “{name}”? Students can still get it from its teacher or from each other.',
    disk: '{free} free of {total}',
    error: 'Error: {error} (trying again in a minute)',
    failed: 'That didn’t work. Is the seeder still running?',
    fetching: 'Fetching…',
    fetchingVersion: 'Fetching {version}…',
    invalid: 'That isn’t a Matko code or link.',
    kept: 'Kept',
    keptCount: '{count} kept',
    keptState: 'Kept · {when}',
    kind: { channel: 'channel', course: 'course', program: 'program' },
    language: 'Language',
    listedBy: 'kept for {name}',
    lookingUp: 'Looking it up…',
    nothing: 'Nothing is kept yet. Paste a code above.',
    notRunning: 'Not running',
    online: 'Online',
    peers: '{count} connected',
    recent: 'Recent',
    remove: 'Remove',
    removed: 'Removed.',
    spaceCapFull: 'The seeder reached its size limit ({max}). What’s kept stays online; new codes wait until something is removed or the limit is raised.',
    spaceCapLow: 'The seeder is close to its size limit: {used} of {max}.',
    spaceDiskFull: 'The disk is nearly full ({free} left). What’s kept stays online; new codes wait until there’s more space.',
    spaceDiskLow: 'The disk is getting full: {free} left.',
    title: 'Matko seeder',
    updating: 'fetching {version}…',
    used: 'Matko uses {used}',
    usedOf: 'Matko uses {used} of {max}',
    version: 'Version {version}',
    waiting: 'Waiting to start',
    waitingSpace: 'Waiting for space',
    warning: 'This box can read the courses it keeps. Add only courses you’re happy for whoever runs it to see.',
  },
  sr: {
    addButton: 'Čuvaj',
    addHint: 'Kanal ili program čuva i sve kurseve koje navodi, i one koji se dodaju kasnije.',
    addLabel: 'Kod ili link kursa, programa ili kanala',
    added: 'Dodato. Pojaviće se ispod kad se pronađe na mreži.',
    already: 'To je već na spisku.',
    confirmRemove: 'Da prestane da čuva „{name}“? Učenici ga i dalje mogu dobiti od nastavnika ili jedni od drugih.',
    disk: '{free} slobodno od {total}',
    error: 'Greška: {error} (ponovo za minut)',
    failed: 'Nije uspelo. Da li seeder još radi?',
    fetching: 'Preuzima se…',
    fetchingVersion: 'Preuzima se {version}…',
    invalid: 'To nije Matko kod ni link.',
    kept: 'Čuva',
    keptCount: 'Čuva: {count}',
    keptState: 'Sačuvano · {when}',
    kind: { channel: 'kanal', course: 'kurs', program: 'program' },
    language: 'Jezik',
    listedBy: 'zbog: {name}',
    lookingUp: 'Traži se…',
    nothing: 'Još ništa ne čuva. Nalepi kod iznad.',
    notRunning: 'Ne radi',
    online: 'Na mreži',
    peers: 'povezano: {count}',
    recent: 'Nedavno',
    remove: 'Ukloni',
    removed: 'Uklonjeno.',
    spaceCapFull: 'Dostignuto je ograničenje veličine ({max}). Sačuvano ostaje na mreži; novi kodovi čekaju dok se nešto ne ukloni ili se ograničenje ne poveća.',
    spaceCapLow: 'Blizu je ograničenja veličine: {used} od {max}.',
    spaceDiskFull: 'Disk je skoro pun (ostalo je {free}). Sačuvano ostaje na mreži; novi kodovi čekaju dok ne bude više mesta.',
    spaceDiskLow: 'Disk se puni: ostalo je {free}.',
    title: 'Matko: čuvanje kurseva',
    updating: 'preuzima se {version}…',
    used: 'Matko zauzima {used}',
    usedOf: 'Matko zauzima {used} od {max}',
    version: 'Verzija {version}',
    waiting: 'Čeka pokretanje',
    waitingSpace: 'Čeka mesto na disku',
    warning: 'Ovaj uređaj može da čita kurseve koje čuva. Dodaj samo kurseve za koje ti ne smeta da ih vidi onaj ko ga drži.',
  },
}

const LATIN_TO_CYRILLIC = [
  ['Lj', 'Љ'], ['LJ', 'Љ'], ['lj', 'љ'], ['Nj', 'Њ'], ['NJ', 'Њ'], ['nj', 'њ'], ['Dž', 'Џ'], ['DŽ', 'Џ'], ['dž', 'џ'],
  ['A', 'А'], ['B', 'Б'], ['C', 'Ц'], ['Č', 'Ч'], ['Ć', 'Ћ'], ['D', 'Д'], ['Đ', 'Ђ'], ['E', 'Е'], ['F', 'Ф'], ['G', 'Г'],
  ['H', 'Х'], ['I', 'И'], ['J', 'Ј'], ['K', 'К'], ['L', 'Л'], ['M', 'М'], ['N', 'Н'], ['O', 'О'], ['P', 'П'], ['R', 'Р'],
  ['S', 'С'], ['Š', 'Ш'], ['T', 'Т'], ['U', 'У'], ['V', 'В'], ['Z', 'З'], ['Ž', 'Ж'],
  ['a', 'а'], ['b', 'б'], ['c', 'ц'], ['č', 'ч'], ['ć', 'ћ'], ['d', 'д'], ['đ', 'ђ'], ['e', 'е'], ['f', 'ф'], ['g', 'г'],
  ['h', 'х'], ['i', 'и'], ['j', 'ј'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'],
  ['s', 'с'], ['š', 'ш'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['z', 'з'], ['ž', 'ж'],
]

// Latin to Cyrillic, leaving {placeholders} as they are.
function toCyrillic(text) {
  return text
    .split(/(\{[a-z]+\})/)
    .map((part) => {
      if (/^\{[a-z]+\}$/.test(part)) return part
      let out = ''
      for (let i = 0; i < part.length; ) {
        const pair = LATIN_TO_CYRILLIC.find(([latin]) => part.startsWith(latin, i))
        if (pair) {
          out += pair[1]
          i += pair[0].length
        } else {
          out += part[i]
          i += 1
        }
      }
      return out
    })
    .join('')
}

function cyrillicText(source) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, typeof value === 'string' ? toCyrillic(value) : cyrillicText(value)]),
  )
}

TEXT['sr-Cyrl'] = cyrillicText(TEXT.sr)

function storedLanguage() {
  try {
    return localStorage.getItem('matko-seeder-language')
  } catch {
    return null
  }
}

function pickLanguage() {
  const stored = storedLanguage()
  if (stored && TEXT[stored]) return stored
  for (const wanted of navigator.languages ?? [navigator.language]) {
    const lower = String(wanted).toLowerCase()
    if (lower.startsWith('sr')) return lower.includes('cyrl') || lower === 'sr' || lower === 'sr-rs' ? 'sr-Cyrl' : 'sr'
    if (lower.startsWith('hr') || lower.startsWith('bs') || lower.startsWith('sh')) return 'sr'
  }
  return 'en'
}

let language = pickLanguage()
let latest = null
// The code the "Added" message is about: the message goes once the seeder has
// found it on the network, since its row then says the rest.
let addedCode = null

function t(key, values = {}) {
  const text = key.split('.').reduce((node, part) => node?.[part], TEXT[language]) ?? key
  return text.replace(/\{([a-z]+)\}/g, (_, name) => String(values[name] ?? ''))
}

function bytes(value) {
  if (!Number.isFinite(value)) return '?'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toLocaleString(language, { maximumFractionDigits: size < 10 ? 1 : 0 })} ${units[unit]}`
}

function when(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })
}

const shortCode = (code) => `${code.slice(0, 8)}…`

function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

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

function render() {
  document.documentElement.lang = language
  document.title = t('title')
  for (const node of document.querySelectorAll('[data-text]')) node.textContent = t(node.dataset.text)
  document.getElementById('language').value = language
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
      const time = element('time', '', new Date(at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }))
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
  const message = document.getElementById('message')
  message.textContent = key ? t(key) : ''
  message.className = `message${bad ? ' bad' : ''}`
}

async function refresh() {
  try {
    const response = await fetch('api/state', { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    latest = await response.json()
  } catch {
    if (latest) latest = { ...latest, running: false }
  }
  render()
}

async function post(path, code) {
  const response = await fetch(path, {
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json', 'X-Matko-Seeder': '1' },
    method: 'POST',
  })
  const body = await response.json().catch(() => ({}))
  return { body, ok: response.ok }
}

async function removeCode(code, name) {
  if (!window.confirm(t('confirmRemove', { name }))) return
  try {
    const { ok } = await post('api/remove', code)
    say(ok ? 'removed' : 'failed', !ok)
  } catch {
    say('failed', true)
  }
  await refresh()
}

document.getElementById('add').addEventListener('submit', async (event) => {
  event.preventDefault()
  const input = document.getElementById('code')
  try {
    const { body, ok } = await post('api/add', input.value)
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
})

document.getElementById('language').addEventListener('change', (event) => {
  language = event.target.value
  try {
    localStorage.setItem('matko-seeder-language', language)
  } catch {
    // remembered for this visit only
  }
  say('')
  render()
})

render()
void refresh()
setInterval(refresh, 3000)
