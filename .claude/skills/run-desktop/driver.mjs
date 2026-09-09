// Interactive REPL for driving the Matko Electron app.
//
// Shares its launch and DOM-interaction helpers with the CI suite (e2e/launch.mjs), so
// what you observe here is what the assertions see.
//
// Wrap in tmux and send-keys commands — see SKILL.md.

import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  APP_DIR,
  launchApp,
  listInteractive,
  clickIndex,
  fillIndex,
  clickText,
  bodyText,
  sleep,
  waitFor,
} from '../../../e2e/launch.mjs'

const USER_DATA = process.env.MATKO_USER_DATA || '/tmp/matko-driver-userdata'
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

let harness = null
const need = () => {
  if (!harness) {
    console.log('ERROR: launch first')
    return false
  }
  return true
}

const COMMANDS = {
  async launch(arg) {
    if (harness) return console.log('already launched')
    harness = await launchApp({ userData: USER_DATA, fresh: arg !== 'keep' })
    console.log('launched:', harness.page.url())
    console.log(arg === 'keep' ? '(kept existing userData)' : `(wiped ${USER_DATA})`)
  },

  async ss(name) {
    if (!need()) return
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png')
    await harness.page.screenshot({ path: f })
    console.log('screenshot:', f)
  },

  async url() {
    if (!need()) return
    console.log(harness.page.url())
  },

  async ui() {
    if (!need()) return
    const items = await listInteractive(harness.page)
    for (const it of items) {
      console.log(
        `[${it.i}] ${it.tag}${it.role ? ':' + it.role : ''} ` +
          `${it.text ? JSON.stringify(it.text) : ''}` +
          `${it.placeholder ? ' ph=' + JSON.stringify(it.placeholder) : ''}` +
          `${it.value ? ' val=' + JSON.stringify(it.value) : ''}` +
          `${it.disabled ? ' DISABLED' : ''}`,
      )
    }
    console.log(`(${items.length} interactive)`)
  },

  async hit(idx) {
    if (!need()) return
    console.log('hit', idx, '->', await clickIndex(harness.page, idx))
  },

  async fill(args) {
    if (!need()) return
    const sp = args.indexOf(' ')
    const idx = args.slice(0, sp)
    const value = args.slice(sp + 1)
    console.log('fill', idx, '->', await fillIndex(harness.page, idx, value))
  },

  async 'click-text'(text) {
    if (!need()) return
    console.log('click-text', JSON.stringify(text), '->', await clickText(harness.page, text))
  },

  async 'real-click-text'(text) {
    if (!need()) return
    try {
      await harness.page.getByText(text, { exact: true }).first().click({ timeout: 3000 })
      console.log('real-click-text', JSON.stringify(text), '-> OK')
    } catch (error) {
      console.log('real-click-text', JSON.stringify(text), '-> ERROR', error.message)
    }
  },

  async text(sel) {
    if (!need()) return
    console.log(await bodyText(harness.page, sel || null))
  },

  async press(key) {
    if (!need()) return
    await harness.page.keyboard.press(key)
    console.log('pressed', key)
  },

  // Call the preload bridge: renderer -> preload -> ipcMain -> filesystem.
  async ipc(expr) {
    if (!need()) return
    try {
      const r = await harness.page.evaluate(`(async () => (${expr}))()`)
      console.log(JSON.stringify(r, null, 2))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  async eval(expr) {
    if (!need()) return
    try {
      console.log(JSON.stringify(await harness.page.evaluate(expr), null, 2))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  // Evaluate in the MAIN process. Receives Electron's module object, e.g.
  //   main ctx.app.getPath('userData')
  async main(expr) {
    if (!need()) return
    try {
      const r = await harness.app.evaluate(new Function('ctx', `return (${expr})`))
      console.log(JSON.stringify(r, null, 2))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  async reload() {
    if (!need()) return
    await harness.page.reload()
    await waitFor(harness.page, () => (document.getElementById('root')?.childElementCount ?? 0) > 0)
    console.log('reloaded:', harness.page.url())
  },

  async wait(ms) {
    await sleep(Number(ms) || 1000)
    console.log('waited', ms || 1000)
  },

  async errors() {
    if (!need()) return
    console.log(harness.errors.length ? harness.errors.join('\n') : '(none)')
  },

  async files(sub) {
    const dir = path.join(USER_DATA, sub || 'courses')
    if (!fs.existsSync(dir)) return console.log('missing:', dir)
    const walk = (d, depth = 0) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        console.log('  '.repeat(depth) + (e.isDirectory() ? e.name + '/' : e.name))
        if (e.isDirectory() && depth < 3) walk(path.join(d, e.name), depth + 1)
      }
    }
    console.log(dir)
    walk(dir)
  },

  async quit() {
    await harness?.close()
    harness = null
    console.log('closed')
  },

  help() {
    console.log('app dir:', APP_DIR)
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  },
}

const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') })
const rl = readline.createInterface({
  input: stdin,
  output: process.stdout,
  prompt: 'driver> ',
})

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return rl.prompt()
  const sp = trimmed.indexOf(' ')
  const cmd = sp === -1 ? trimmed : trimmed.slice(0, sp)
  const rest = sp === -1 ? '' : trimmed.slice(sp + 1)
  const fn = COMMANDS[cmd]
  if (!fn) {
    console.log('unknown:', cmd, '- try: help')
    return rl.prompt()
  }
  try {
    await fn(rest)
  } catch (e) {
    console.log('ERROR:', e.message)
  }
  if (cmd === 'quit') {
    rl.close()
    process.exit(0)
  }
  rl.prompt()
})
rl.on('close', async () => {
  await COMMANDS.quit()
  process.exit(0)
})

console.log('matko driver - "help" for commands, "launch" to start (fresh userData)')
rl.prompt()
