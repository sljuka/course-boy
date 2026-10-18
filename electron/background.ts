// Keep sharing in the background (SLJ-129): peer-to-peer sharing only works
// while the app runs, so closing the window can leave it running, with a
// menu bar (tray) icon to open it again or quit.
//
// - The first time the window is closed while there's something to share,
//   the window is asked (`ask`): "Keep sharing while Matko is closed?". The
//   answer is saved as a preference; later closes follow it.
// - Keeping: the window hides (macOS: and the Dock icon), the tray shows what's
//   shared, with Open Matko and Quit Matko.
// - Quitting (the answer, the tray's Quit, Cmd+Q): everything stops.
// - Opened at login: starts hidden, with just the tray.
//
// Linux has no reliable tray on every desktop, so there closing quits as
// before (`isSupported`).

import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'

export type BackgroundDeps = {
  // The saved answer; undefined before anyone was asked.
  keepSharing(): boolean | undefined
  // Courses made or imported, or an import waiting: worth keeping running.
  hasSomethingToShare(): boolean
  // The tray's texts, in the app's language.
  texts(): { open: string; quit: string; status: string; tooltip: string }
  // Asks the window the question (it answers through the preferences).
  ask(window: BrowserWindow): void
}

export const isBackgroundSupported = process.platform === 'darwin' || process.platform === 'win32'

// Started by the login item: no window until the tray's Open Matko.
export function isStartingHidden(): boolean {
  return process.argv.includes('--hidden') || (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin)
}

// Starting hidden: `--hidden` on Windows; on macOS, `wasOpenedAtLogin`
// (Electron dropped `openAsHidden`, which macOS 13+ ignored anyway).
export function setOpenAtLogin(openAtLogin: boolean): void {
  if (!isBackgroundSupported) return
  app.setLoginItemSettings({ args: ['--hidden'], openAtLogin })
}

// The tray icon: a target (the app's "shared" mark), drawn here so nothing
// needs shipping; black with alpha, a template image on macOS so it follows
// the menu bar's light or dark look.
function trayIcon(): Electron.NativeImage {
  const size = 32
  const pixels = Buffer.alloc(size * size * 4)
  const centre = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - centre, y - centre)
      const inDot = distance <= 5.5
      const inRing = distance >= 10.5 && distance <= 13.5
      const offset = (y * size + x) * 4
      // BGRA; Windows has no template images, so it's drawn dark grey there.
      const shade = process.platform === 'darwin' ? 0 : 60
      pixels[offset] = shade
      pixels[offset + 1] = shade
      pixels[offset + 2] = shade
      pixels[offset + 3] = inDot || inRing ? 255 : 0
    }
  }
  const image = nativeImage.createFromBitmap(pixels, { height: size, scaleFactor: 2, width: size })
  if (process.platform === 'darwin') image.setTemplateImage(true)
  return image
}

export function createBackground(deps: BackgroundDeps) {
  let isQuitting = false
  let tray: Tray | null = null
  let refresh: ReturnType<typeof setInterval> | null = null
  let window: BrowserWindow | null = null

  app.on('before-quit', () => {
    isQuitting = true
    tray?.destroy()
    tray = null
    if (refresh) clearInterval(refresh)
  })

  function updateTray() {
    if (!tray) return
    const texts = deps.texts()
    tray.setToolTip(texts.tooltip)
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { enabled: false, label: texts.status },
        { type: 'separator' },
        { click: () => show(), label: texts.open },
        { click: () => quit(), label: texts.quit },
      ]),
    )
  }

  function ensureTray() {
    if (tray || !isBackgroundSupported) return
    tray = new Tray(trayIcon())
    updateTray()
    // What's shared changes on its own (imports landing, peers): kept fresh.
    refresh = setInterval(updateTray, 15_000)
  }

  function hide() {
    if (!window) return
    ensureTray()
    window.hide()
    if (process.platform === 'darwin') app.dock?.hide()
  }

  function show() {
    if (!window) return
    if (process.platform === 'darwin') void app.dock?.show()
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  function quit() {
    isQuitting = true
    app.quit()
  }

  return {
    // The main window: its close follows the saved answer, or asks.
    attach(target: BrowserWindow, { hidden = false } = {}) {
      window = target
      if (hidden) ensureTray()
      target.on('close', (event) => {
        if (isQuitting || !isBackgroundSupported) return
        const keep = deps.keepSharing()
        if (keep === true) {
          event.preventDefault()
          hide()
        } else if (keep === undefined && deps.hasSomethingToShare()) {
          event.preventDefault()
          deps.ask(target)
        } else if (keep === false) {
          // Their answer was to quit: on macOS too, where closing the last
          // window otherwise leaves the app running.
          isQuitting = true
          app.quit()
        }
      })
    },

    // The window answered the question: hide, or quit.
    answered(keep: boolean) {
      if (keep) hide()
      else quit()
    },

    // Kept running and opened again (the Dock, a second launch).
    show,

    // "Keep sharing" switched in Settings: the tray follows.
    settingChanged(keep: boolean) {
      if (keep && window && !window.isVisible()) ensureTray()
      updateTray()
    },

    isQuitting: () => isQuitting,
  }
}

export type Background = ReturnType<typeof createBackground>
