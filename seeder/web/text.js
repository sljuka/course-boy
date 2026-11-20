// The page's words (SLJ-194): English and Serbian; the Cyrillic text is made
// from the Latin one, so the two never drift apart. Also the reader's
// language, and how numbers, sizes and times are written in it.

export const TEXT = {
  en: {
    accountAdded: 'Account added. Give them its name and password; they can change the password after signing in.',
    accountRemoved: 'Account removed.',
    accounts: 'Accounts',
    accountsHint: 'People who can manage what this seeder keeps.',
    addAccount: 'Add account',
    admin: 'admin',
    badName: 'A name is 1 to 32 characters.',
    badPassword: 'A password is at least 8 characters.',
    cancel: 'Cancel',
    changePassword: 'Change password',
    confirmRemoveAccount: 'Remove the account “{name}”? It’s signed out at once.',
    createAccount: 'Create account',
    currentPassword: 'Current password',
    mismatch: 'The passwords don’t match.',
    name: 'Name',
    newPassword: 'New password',
    password: 'Password',
    passwordAgain: 'Password again',
    passwordChanged: 'Password changed.',
    passwordReset: 'New password set. “{name}” is signed out everywhere.',
    resetPassword: 'Reset password',
    save: 'Save',
    setupElsewhere: 'No account yet. Make the first one, the admin, on the computer running the seeder: {command}',
    setupHint: 'This account manages the seeder, and the other accounts. Choose a name, and a password of at least 8 characters.',
    setupTitle: 'Create the admin account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signedInAs: 'Signed in as {name}',
    startingPassword: 'Starting password',
    taken: 'There’s already an account with that name.',
    wait: 'Too many tries. Wait a minute, then try again.',
    wrong: 'Wrong name or password.',
    wrongCurrent: 'The current password is wrong.',
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
    accountAdded: 'Nalog je dodat. Prosledi ime i lozinku; lozinka se može promeniti posle prijave.',
    accountRemoved: 'Nalog je uklonjen.',
    accounts: 'Nalozi',
    accountsHint: 'Ljudi koji mogu da upravljaju onim što ovaj seeder čuva.',
    addAccount: 'Dodaj nalog',
    admin: 'administrator',
    badName: 'Ime ima od 1 do 32 znaka.',
    badPassword: 'Lozinka ima bar 8 znakova.',
    cancel: 'Otkaži',
    changePassword: 'Promeni lozinku',
    confirmRemoveAccount: 'Ukloniti nalog „{name}“? Odmah se odjavljuje.',
    createAccount: 'Napravi nalog',
    currentPassword: 'Trenutna lozinka',
    mismatch: 'Lozinke se ne poklapaju.',
    name: 'Ime',
    newPassword: 'Nova lozinka',
    password: 'Lozinka',
    passwordAgain: 'Lozinka još jednom',
    passwordChanged: 'Lozinka je promenjena.',
    passwordReset: 'Nova lozinka je postavljena. Nalog „{name}“ je odjavljen svuda.',
    resetPassword: 'Nova lozinka',
    save: 'Sačuvaj',
    setupElsewhere: 'Još nema naloga. Prvi, administratorski, napravi na računaru na kom radi seeder: {command}',
    setupHint: 'Ovaj nalog upravlja seederom i ostalim nalozima. Izaberi ime i lozinku od bar 8 znakova.',
    setupTitle: 'Napravi administratorski nalog',
    signIn: 'Prijavi se',
    signOut: 'Odjavi se',
    signedInAs: 'Nalog: {name}',
    startingPassword: 'Početna lozinka',
    taken: 'Već postoji nalog s tim imenom.',
    wait: 'Previše pokušaja. Sačekaj minut, pa pokušaj ponovo.',
    wrong: 'Pogrešno ime ili lozinka.',
    wrongCurrent: 'Trenutna lozinka nije tačna.',
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

export function t(key, values = {}) {
  const text = key.split('.').reduce((node, part) => node?.[part], TEXT[language]) ?? key
  return text.replace(/\{([a-z]+)\}/g, (_, name) => String(values[name] ?? ''))
}

export const currentLanguage = () => language

export function setLanguage(next) {
  language = next
  try {
    localStorage.setItem('matko-seeder-language', language)
  } catch {
    // remembered for this visit only
  }
}

export function bytes(value) {
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

export function when(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })
}

export const shortCode = (code) => `${code.slice(0, 8)}…`
