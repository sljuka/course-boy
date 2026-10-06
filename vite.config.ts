import { defineConfig } from 'vite'
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
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
