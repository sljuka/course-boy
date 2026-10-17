// `matko://` links reaching the app (SLJ-8, SLJ-60): clicked in its window,
// in another app while it runs, or launching it. They're queued here until
// the window takes them (`window:take-app-links`), so one that arrives before
// the window is ready, or while the launcher or onboarding shows, waits for a
// profile instead of being lost. Main tells the window when one arrives
// (`window:app-links-waiting`); the window decides where it goes
// (src/lib/app-links.ts).
//
// How links reach main:
// - macOS: the `open-url` event, also for the link that launched the app.
// - Windows and Linux: the link is a command-line argument, of the app's own
//   launch or, while it runs, of a second launch that hands it over
//   (`second-instance`) and quits.
//
// Registering the scheme with the system: electron-builder's `protocols`
// (macOS Info.plist, the Windows installer, deb/rpm desktop entries), plus at
// startup in packaged builds `app.setAsDefaultProtocolClient` (Windows,
// macOS) and, for the Linux AppImage, a desktop entry of its own
// (`appImageDesktopEntry`), since an AppImage is never installed.

import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// Matches APP_LINK_SCHEME in src/lib/app-links.ts.
export const APP_LINK_SCHEME = 'matko'

export type AppLinkRequest = { newTab: boolean; url: string }

// What a link from outside the app may look like before main keeps it
// (SLJ-151): the scheme, then only the characters course, lesson and program
// ids and codes use. No spaces, quotes, `?`, `#` or `%`, so a crafted link
// can't carry anything else along (on Windows a link arrives as a command-line
// argument, the way CVE-2018-1000006 smuggled in Chromium switches). The
// window still checks each link exactly (`parseAppLink` in src/lib/app-links.ts).
const ACCEPTABLE_APP_LINK = new RegExp(`^${APP_LINK_SCHEME}://[a-z0-9._/-]{1,500}$`, 'i')

export function isAcceptableAppLink(url: unknown): url is string {
  return typeof url === 'string' && ACCEPTABLE_APP_LINK.test(url)
}

// The `matko://` link among a launch's arguments, if any. Only that one
// argument is ever used: a second launch's other arguments (`--profile=…`,
// `--user-data-dir=…`) never reach the running app.
export function findAppLinkInArgv(argv: readonly string[]): string | null {
  return argv.find(isAcceptableAppLink) ?? null
}

// Links waiting for the window. `notify`: tell the window one is waiting.
export function createAppLinkQueue(notify: () => void) {
  let waiting: AppLinkRequest[] = []
  return {
    add(request: AppLinkRequest) {
      if (!isAcceptableAppLink(request.url)) return
      // Bounded: links only come from clicks, never a stream.
      waiting = [...waiting, request].slice(-10)
      notify()
    },
    take(): AppLinkRequest[] {
      const taken = waiting
      waiting = []
      return taken
    },
  }
}

const DESKTOP_FILE = 'matko-appimage.desktop'

// The AppImage's desktop entry: opens `matko://` links with this AppImage,
// wherever it was put. Quoted, as the desktop entry spec asks.
export function appImageDesktopEntry(appImagePath: string): string {
  const exec = `"${appImagePath.replace(/(["`$\\])/g, '\\$1')}"`
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Matko',
    `Exec=${exec} %u`,
    'Terminal=false',
    'NoDisplay=true',
    `MimeType=x-scheme-handler/${APP_LINK_SCHEME};`,
    '',
  ].join('\n')
}

// Linux AppImage only: writes the desktop entry (when it changed, e.g. the
// AppImage moved) and makes it the handler for `matko://`. Failures are
// logged, never thrown: links just won't open the app.
export async function registerAppImageScheme(appImagePath: string): Promise<void> {
  const directory = path.join(os.homedir(), '.local', 'share', 'applications')
  const file = path.join(directory, DESKTOP_FILE)
  const entry = appImageDesktopEntry(appImagePath)
  const current = await fs.readFile(file, 'utf8').catch(() => null)
  if (current === entry) return

  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(file, entry)
  const run = (command: string, args: string[]) =>
    new Promise<void>((resolve) => {
      execFile(command, args, (error) => {
        if (error) console.warn(`[app-links] ${command} failed:`, error.message)
        resolve()
      })
    })
  await run('xdg-mime', ['default', DESKTOP_FILE, `x-scheme-handler/${APP_LINK_SCHEME}`])
  await run('update-desktop-database', [directory])
}
