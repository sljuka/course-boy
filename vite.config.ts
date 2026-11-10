import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import { configDefaults } from 'vitest/config'
import type { ChildProcess } from 'node:child_process'
import path from 'node:path'
import { startup } from 'vite-plugin-electron'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// MATKO_DEV_ELECTRON_ARGS: extra arguments for the dev app, space-separated,
// e.g. "--user-data-dir=/tmp/matko-teacher" to keep a teacher and a student
// apart while developing.
const devElectronArgs = ['.', '--no-sandbox', ...(process.env.MATKO_DEV_ELECTRON_ARGS?.split(' ').filter(Boolean) ?? [])]

// After a change to the main process the plugin restarts Electron: it kills the
// old one and starts the new one at once. The new one then finds the old one
// still holding the single-instance lock (see electron/main.ts), quits, and
// the plugin stops Vite with it. So wait until the old Electron has really
// exited (its P2P worker too: startup.exit kills the whole tree), then start.
async function restartDevElectron(): Promise<void> {
  const previous = (process as NodeJS.Process & { electronApp?: ChildProcess }).electronApp
  const isRunning = Boolean(previous && previous.exitCode === null && previous.signalCode === null)

  // Removes the plugin's "stop Vite when Electron exits" listener, then kills.
  await startup.exit()
  if (previous && isRunning) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 5_000)
      previous.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  await startup(devElectronArgs)
}

// The window's Content-Security-Policy (SLJ-154): the backstop if a script
// ever slips into the window through course content (a BlockNote or DOMPurify
// bug, a new exercise kind rendering raw markup). Then it can't run, so it
// never reaches the preload's bridges (publishing, identity, profiles).
// - Scripts: only the app's own files, plus each inline script of index.html
//   by its hash (the theme before the first paint), so no other inline script
//   or `eval` runs.
// - Styles may be inline (React's `style=`, BlockNote): a much smaller risk.
// - Course images, video and audio come over `matko-asset:`; data: and blob:
//   for pictures made in the page (video print frames, uploads).
// Build only: in development Vite's own inline script and HMR websocket need
// a looser page, and the built app is what ships.
function contentSecurityPolicy(): Plugin {
  return {
    apply: 'build',
    name: 'matko-content-security-policy',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inlineScripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(
          ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          ["script-src 'self'", ...inlineScripts].join(' '),
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' matko-asset: data: blob:",
          "media-src 'self' matko-asset: data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' matko-asset:",
          "object-src 'none'",
          "frame-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
        ].join('; ')
        return {
          html,
          tags: [{ attrs: { content: policy, 'http-equiv': 'Content-Security-Policy' }, injectTo: 'head-prepend', tag: 'meta' }],
        }
      },
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    contentSecurityPolicy(),
    tailwindcss(),
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        onstart: () => restartDevElectron(),
        vite: {
          build: {
            rollupOptions: {
              // bare-runtime resolves its per-platform prebuild package via a
              // computed `require()` at runtime, which Rollup can't statically
              // bundle — leave it as a real `require()` in the output instead.
              external: ['bare-runtime', 'bare-runtime/spawn'],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // `release/` holds packaged copies of the app (`npm run check:packaged`).
    exclude: [...configDefaults.exclude, 'release/**'],
  },
})
