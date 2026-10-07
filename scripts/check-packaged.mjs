// Launches the *packaged* app (from `electron-builder --dir`) and checks what
// only a packaged build can get wrong: files left out of the bundle, and the
// Bare worker failing to start outside the repo. `npm run dev` and
// `npm run check:e2e` both run from the repo, so they can't catch these.
//
// Run through `npm run check:packaged`, which builds first.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { APP_DIR, launchApp } from '../e2e/launch.mjs'

const BUNDLED_COURSE_ID = 'thys2vej6my5mpxt'
const WORKER_TIMEOUT_MS = 30_000

function fail(message) {
  console.error(`✖ ${message}`)
  process.exitCode = 1
}

// electron-builder --dir writes release/<version>/<platform dir>/…
function findPackagedApp() {
  const { name: packageName, version } = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8'))
  const releaseDir = path.join(APP_DIR, 'release', version)
  const platformDirs = fs.existsSync(releaseDir)
    ? fs.readdirSync(releaseDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : []

  for (const platformDir of platformDirs) {
    const dir = path.join(releaseDir, platformDir.name)

    if (process.platform === 'darwin') {
      const bundle = fs.readdirSync(dir).find((name) => name.endsWith('.app'))
      if (bundle) {
        const name = bundle.slice(0, -'.app'.length)
        return {
          executable: path.join(dir, bundle, 'Contents/MacOS', name),
          resources: path.join(dir, bundle, 'Contents/Resources'),
        }
      }
    } else if (platformDir.name.endsWith('-unpacked')) {
      // The app's own executable is named after the product/package (`Matko.exe`,
      // `matko`); match it by name, because Chromium ships other executables
      // next to it (`chrome-sandbox`, `chrome_crashpad_handler`).
      const executable = fs
        .readdirSync(dir)
        .map((name) => path.join(dir, name))
        .find(
          (file) =>
            fs.statSync(file).isFile() &&
            path.basename(file, '.exe').toLowerCase() === packageName.toLowerCase() &&
            (process.platform === 'win32' ? file.endsWith('.exe') : (fs.statSync(file).mode & 0o111) !== 0),
        )
      if (executable) return { executable, resources: path.join(dir, 'resources') }
    }
  }

  throw new Error(`No packaged app under ${releaseDir}; run \`npm run check:packaged\`.`)
}

const packaged = findPackagedApp()
console.log(`Packaged app: ${packaged.executable}`)

// 1. Files the app reads from its own folder at runtime.
const appDir = path.join(packaged.resources, 'app')
if (fs.existsSync(path.join(packaged.resources, 'app.asar'))) {
  fail('app.asar exists: asar must be off, the Bare worker cannot load from inside it (CLAUDE.md).')
}
for (const required of ['workers/main.cjs', `courses/${BUNDLED_COURSE_ID}/course.json`, 'presets']) {
  if (fs.existsSync(path.join(appDir, required))) {
    console.log(`✔ ships ${required}`)
  } else {
    fail(`missing from the package: ${required}`)
  }
}

const shippedTests = fs
  .readdirSync(path.join(appDir, 'workers'), { recursive: true })
  .filter((file) => /\.test\./.test(String(file)))
if (shippedTests.length > 0) {
  fail(`test files shipped in workers/: ${shippedTests.join(', ')}`)
}

// 2. The running app: bundled course seeded, Bare worker up.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-packaged-'))
const harness = await launchApp({ packagedExecutable: packaged.executable, userData })

try {
  const courses = await harness.page.evaluate(() => window.courses.list('en'))
  if (courses.some((course) => course.id === BUNDLED_COURSE_ID)) {
    console.log('✔ lists the bundled course')
  } else {
    fail(`the bundled course is not listed (got: ${courses.map((course) => course.id).join(', ') || 'none'})`)
  }

  // The worker reports its state on a main-process global (electron/bare-worker.ts):
  // 'spawning' until it answers, then 'ready', or 'error: …'.
  const deadline = Date.now() + WORKER_TIMEOUT_MS
  let workerState
  do {
    workerState = await harness.app.evaluate(() => globalThis.__matkoWorkerStatus)
    if (workerState && workerState !== 'spawning') break
    await new Promise((resolve) => setTimeout(resolve, 250))
  } while (Date.now() < deadline)

  if (workerState === 'ready') {
    console.log('✔ the Bare worker started and answered')
  } else {
    fail(`the Bare worker did not answer: ${String(workerState)}`)
  }
} finally {
  await harness.close()
  fs.rmSync(userData, { force: true, recursive: true })
}

console.log(process.exitCode ? '\nPackaged check failed.' : '\nPackaged check passed.')
