// The seeder's page (SLJ-194): asks /api/session who the visitor is and shows
// the first-run screen, the sign-in form, or what the seeder keeps (kept.js),
// with the account bar and, for the admin, the Accounts section (account.js).
// English and Serbian (text.js).
import { loadAccounts, renderAccounts, whenAccountChanges } from './account.js'
import { renderKept, startKept, stopKept } from './kept.js'
import { getJson, whenSignedOut } from './page.js'
import { currentLanguage, setLanguage, t } from './text.js'

const byId = (id) => document.getElementById(id)
// The last /api/session answer.
let session = null

function renderWords() {
  document.documentElement.lang = currentLanguage()
  document.title = t('title')
  for (const node of document.querySelectorAll('[data-text]')) node.textContent = t(node.dataset.text)
  byId('language').value = currentLanguage()
  byId('setup-elsewhere').textContent = t('setupElsewhere', { command: 'node seeder/cli.mjs add-user <name>' })
  byId('signed-in-as').textContent = session?.name ? t('signedInAs', { name: session.name }) : ''
}

// mode: 'open' | 'signed-in' | 'login' | 'setup' | 'setup-elsewhere' (web.mjs).
async function showView() {
  const { body, ok } = await getJson('api/session')
  session = ok ? body : { mode: 'login' }
  const { admin, mode } = session
  const mayUse = mode === 'open' || mode === 'signed-in'
  byId('setup-form').hidden = mode !== 'setup'
  byId('setup-elsewhere').hidden = mode !== 'setup-elsewhere'
  byId('login-form').hidden = mode !== 'login'
  byId('seeder').hidden = !mayUse
  byId('account-bar').hidden = mode !== 'signed-in'
  byId('accounts-section').hidden = !(mode === 'signed-in' && admin)
  if (mode !== 'signed-in') byId('password-form').hidden = true
  renderWords()

  if (mayUse) startKept()
  else stopKept()
  if (mode === 'signed-in' && admin) await loadAccounts()
  const first = byId(mode === 'setup' ? 'setup-form' : 'login-form')
  if (!first.hidden) first.querySelector('input')?.focus()
}

whenAccountChanges(showView)
whenSignedOut(showView)

byId('language').addEventListener('change', (event) => {
  setLanguage(event.target.value)
  renderWords()
  renderKept()
  renderAccounts()
})

renderWords()
void showView()
