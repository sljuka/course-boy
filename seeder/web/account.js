// Accounts on the seeder's page (SLJ-194): the first-run screen that makes the
// admin, signing in and out, changing your own password, and the admin's
// Accounts section (add, reset a password, remove).
import { accountErrorKey, element, getJson, post, say } from './page.js'
import { t, when } from './text.js'

const byId = (id) => document.getElementById(id)

// Called after signing in or out, to show the right view (app.js).
let onChange = () => {}
export function whenAccountChanges(callback) {
  onChange = callback
}

const field = (form, name) => form.elements.namedItem(name)

// The setup and sign-in forms: name and password (and, for setup, the
// password again).
byId('setup-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const message = form.querySelector('.message')
  if (field(form, 'password').value !== field(form, 'again').value) {
    say(message, 'mismatch', { bad: true })
    return
  }
  const result = await post('api/setup', { name: field(form, 'name').value, password: field(form, 'password').value })
  if (!result.ok) {
    say(message, accountErrorKey(result), { bad: true })
    return
  }
  form.reset()
  say(message, '')
  onChange()
})

byId('login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const message = form.querySelector('.message')
  const result = await post('api/login', { name: field(form, 'name').value, password: field(form, 'password').value })
  if (!result.ok) {
    say(message, accountErrorKey(result), { bad: true })
    return
  }
  form.reset()
  say(message, '')
  onChange()
})

byId('sign-out').addEventListener('click', async () => {
  await post('api/logout')
  onChange()
})

// Changing your own password: the current one, then the new one twice.
const passwordForm = byId('password-form')
byId('change-password').addEventListener('click', () => {
  passwordForm.hidden = !passwordForm.hidden
  say(passwordForm.querySelector('.message'), '')
  if (!passwordForm.hidden) field(passwordForm, 'current').focus()
})
byId('password-cancel').addEventListener('click', () => {
  passwordForm.reset()
  passwordForm.hidden = true
})
passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const message = passwordForm.querySelector('.message')
  if (field(passwordForm, 'password').value !== field(passwordForm, 'again').value) {
    say(message, 'mismatch', { bad: true })
    return
  }
  const result = await post('api/password', { current: field(passwordForm, 'current').value, password: field(passwordForm, 'password').value })
  if (!result.ok) {
    say(message, result.body.error === 'wrong' ? 'wrongCurrent' : accountErrorKey(result), { bad: true })
    return
  }
  passwordForm.reset()
  say(message, 'passwordChanged')
})

// The admin's list of accounts.
let accounts = []
// The account whose password is being reset, if any: its row shows a field.
let resetting = null

function accountRow(account) {
  const item = element('li')
  const top = element('div', 'row')
  const heading = element('span', 'heading')
  heading.append(element('span', 'name', account.name))
  if (account.admin) heading.append(element('span', 'version', t('admin')))
  top.append(heading)
  if (!account.admin) {
    const actions = element('span', 'actions')
    const reset = element('button', 'quiet', t('resetPassword'))
    reset.type = 'button'
    reset.addEventListener('click', () => {
      resetting = resetting === account.name ? null : account.name
      renderAccounts()
    })
    const remove = element('button', 'quiet', t('remove'))
    remove.type = 'button'
    remove.addEventListener('click', () => removeAccount(account.name))
    actions.append(reset, remove)
    top.append(actions)
  }
  item.append(top, element('div', 'meta', when(account.createdAt)))
  if (resetting === account.name) item.append(resetForm(account.name))
  return item
}

function resetForm(name) {
  const form = element('form', 'inline-form')
  const label = element('label')
  label.append(element('span', '', t('newPassword')))
  const input = element('input')
  Object.assign(input, { autocomplete: 'new-password', minLength: 8, name: 'password', required: true, type: 'password' })
  label.append(input)
  const save = element('button', '', t('save'))
  save.type = 'submit'
  const cancel = element('button', 'quiet', t('cancel'))
  cancel.type = 'button'
  cancel.addEventListener('click', () => {
    resetting = null
    renderAccounts()
  })
  form.append(label, save, cancel)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const result = await post('api/accounts/reset', { name, password: input.value })
    if (!result.ok) {
      say(byId('accounts-message'), accountErrorKey(result), { bad: true })
      return
    }
    resetting = null
    accounts = result.body.accounts
    renderAccounts()
    say(byId('accounts-message'), 'passwordReset', { values: { name } })
  })
  queueMicrotask(() => input.focus())
  return form
}

async function removeAccount(name) {
  if (!window.confirm(t('confirmRemoveAccount', { name }))) return
  const result = await post('api/accounts/remove', { name })
  if (!result.ok) {
    say(byId('accounts-message'), accountErrorKey(result), { bad: true })
    return
  }
  accounts = result.body.accounts
  renderAccounts()
  say(byId('accounts-message'), 'accountRemoved')
}

byId('add-account').addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const result = await post('api/accounts/add', { name: field(form, 'name').value, password: field(form, 'password').value })
  if (!result.ok) {
    say(byId('accounts-message'), accountErrorKey(result), { bad: true })
    return
  }
  form.reset()
  accounts = result.body.accounts
  renderAccounts()
  say(byId('accounts-message'), 'accountAdded')
})

export function renderAccounts() {
  byId('accounts').replaceChildren(...accounts.map(accountRow))
}

// The admin's section: loaded when shown.
export async function loadAccounts() {
  const { body, ok } = await getJson('api/accounts')
  accounts = ok ? body.accounts : []
  resetting = null
  renderAccounts()
}
