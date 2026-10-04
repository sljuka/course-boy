// Keeps the app window showing only the app (SLJ-48). Course content comes
// from other people (P2P import), and a page in this window gets the preload's
// bridges (`window.courses`, `window.sharing`, …), so an outside page must never
// load here, in this window or a new one:
// - new windows are always refused; an http(s) link opens in the system browser;
// - navigating away from the app is blocked (http(s) goes to the browser);
// - <webview> is refused;
// - permission requests are denied except the few the app uses.
// The URL rule is a pure function (`classifyUrl`), tested in
// window-security.test.ts.

import { type BrowserWindow, type Session, shell } from 'electron'

export type UrlKind = 'app' | 'external' | 'blocked'

// `appUrls`: the dev server's URL, or the built index.html's file:// URL.
export function classifyUrl(url: string, appUrls: string[]): UrlKind {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'blocked'
  }

  for (const appUrl of appUrls) {
    const app = new URL(appUrl)
    if (app.protocol === 'file:') {
      // The built app: exactly its index.html (any #route), nothing else on disk.
      if (parsed.protocol === 'file:' && parsed.pathname === app.pathname) return 'app'
    } else if (parsed.origin === app.origin) {
      // The dev server: anything it serves.
      return 'app'
    }
  }

  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? 'external' : 'blocked'
}

// Only what the app actually uses: copying the course code, and fullscreen video.
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen'])

export function lockDownSession(session: Session): void {
  session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission))
  })
  session.setPermissionCheckHandler((_webContents, permission) => ALLOWED_PERMISSIONS.has(permission))
}

export function lockDownWindow(win: BrowserWindow, appUrls: string[]): void {
  const contents = win.webContents

  const openOutside = (url: string) => {
    if (classifyUrl(url, appUrls) === 'external') {
      // Accessed at call time (not destructured), so tests can stub it.
      void shell.openExternal(url)
    }
  }

  contents.setWindowOpenHandler(({ url }) => {
    openOutside(url)
    return { action: 'deny' }
  })

  const guardNavigation = (event: Electron.Event, url: string) => {
    if (classifyUrl(url, appUrls) !== 'app') {
      event.preventDefault()
      openOutside(url)
    }
  }

  contents.on('will-navigate', guardNavigation)
  contents.on('will-redirect', guardNavigation)
  contents.on('will-attach-webview', (event) => event.preventDefault())
}
