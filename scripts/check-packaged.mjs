// Launches the *packaged* app (from `electron-builder --dir`) and checks what
// only a packaged build can get wrong: files left out of the bundle, and the
// Bare worker failing to start outside the repo. `npm run dev` and
// `npm run check:e2e` both run from the repo, so they can't catch these.
//
// Run through `npm run check:packaged`, which builds first.

import { spawn } from 'node:child_process'
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
for (const required of ['workers/main.cjs', `courses/${BUNDLED_COURSE_ID}/course.json`, 'courses/bundled.json', 'presets']) {
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

// 2. The running app: bundled course seeded, Bare worker up, and `matko://`
// links reaching it (SLJ-8) as a launch argument and from a second launch,
// the way Windows and Linux hand them over. The fresh profile is still at
// onboarding, so the links wait in main to be taken.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-packaged-'))
const launchLink = `matko://import/${'y'.repeat(52)}`
const secondLink = `matko://import/${'b'.repeat(52)}`
const harness = await launchApp({ args: [launchLink], packagedExecutable: packaged.executable, userData })

try {
  const courses = await harness.page.evaluate(() => window.courses.list('en'))
  if (courses.some((course) => course.id === BUNDLED_COURSE_ID)) {
    console.log('✔ lists the bundled course')
  } else {
    fail(`the bundled course is not listed (got: ${courses.map((course) => course.id).join(', ') || 'none'})`)
  }

  // The Bare worker answers: setting up a publishing identity (in this
  // throwaway profile) seals it in the worker, so `ok` comes only from a
  // running worker. Retried while it's still starting.
  const deadline = Date.now() + WORKER_TIMEOUT_MS
  let workerState
  do {
    const result = await harness.page
      .evaluate(() => window.sharing.setUpIdentity('packaged check password'))
      .catch((error) => ({ error: String(error) }))
    workerState = result?.ok ? 'ready' : JSON.stringify(result)
    if (workerState === 'ready') break
    await new Promise((resolve) => setTimeout(resolve, 500))
  } while (Date.now() < deadline)

  if (workerState === 'ready') {
    console.log('✔ the Bare worker started and answered')
  } else {
    fail(`the Bare worker did not answer: ${String(workerState)}`)
  }

  const takeLinks = async () =>
    (await harness.page.evaluate(() => window.appWindow.takeAppLinks())).map((request) => request.url)
  // macOS hands links over with `open-url`, never as an argument.
  if (process.platform !== 'darwin') {
    const launched = await takeLinks()
    if (launched.includes(launchLink)) console.log('✔ receives the link it was launched with')
    else fail(`the launch link did not arrive (got: ${launched.join(', ') || 'none'})`)

    const second = spawn(packaged.executable, [`--user-data-dir=${userData}`, secondLink], { stdio: 'ignore' })
    const exitCode = await new Promise((resolve) => second.on('exit', resolve))
    const deadline = Date.now() + 10_000
    let handedOver = []
    while (!handedOver.includes(secondLink) && Date.now() < deadline) {
      handedOver = [...handedOver, ...(await takeLinks())]
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (exitCode === 0 && handedOver.includes(secondLink)) {
      console.log('✔ a second launch hands its link over and quits')
    } else {
      fail(`a second launch's link did not arrive (exit ${exitCode}, got: ${handedOver.join(', ') || 'none'})`)
    }
  }
} finally {
  await harness.close()
  fs.rmSync(userData, { force: true, recursive: true })
}

// The fuses (electron-builder.json5, SLJ-152): the packaged program ignores
// ELECTRON_RUN_AS_NODE, NODE_OPTIONS and --inspect. If either variable worked,
// the probe would run and leave its mark; --inspect would print "Debugger
// listening". With them off Matko just starts (in a throwaway folder) and is
// closed after a few seconds.
{
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-fuses-'))
  const mark = path.join(folder, 'probe-ran')
  const probe = path.join(folder, 'probe.cjs')
  fs.writeFileSync(probe, `require('node:fs').writeFileSync(${JSON.stringify(mark)}, 'ran'); process.exit(0)\n`)
  const child = spawn(packaged.executable, [probe, '--inspect=0', `--user-data-dir=${path.join(folder, 'data')}`], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: `--require ${probe}` },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const exited = new Promise((resolve) => child.on('exit', resolve))
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 8_000))])
  if (child.exitCode === null) {
    child.kill()
    await exited
  }
  if (fs.existsSync(mark)) fail('ran a script through ELECTRON_RUN_AS_NODE or NODE_OPTIONS: the fuses are not set')
  else if (/Debugger listening/.test(stderr)) fail('opened the --inspect debugger: the fuse is not set')
  else console.log('✔ ignores ELECTRON_RUN_AS_NODE, NODE_OPTIONS and --inspect (fuses)')
  fs.rmSync(folder, { force: true, recursive: true })
}

console.log(process.exitCode ? '\nPackaged check failed.' : '\nPackaged check passed.')
