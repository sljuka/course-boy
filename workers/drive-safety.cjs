// No symlinks from a drive ever reach the disk (SLJ-150).
//
// A Hyperdrive can hold symlink entries, and Localdrive recreates them on disk
// with whatever target the drive gives, `../../..` included. A drive with
// `/assets -> ../../../Library/LaunchAgents` and then `/assets/evil.plist`
// would have the mirror write evil.plist outside the course folder, through
// the link. Whoever publishes a drive chooses its entries, so every mirror
// from a drive onto disk goes into a `NoSymlinkLocaldrive`, which refuses
// symlinks as they come (no gap between a check and the write).
//
// Matko never puts a symlink in a drive (a published drive is mirrored from
// the teacher's own regular files), so a drive with one isn't a course. The
// hardlinks main makes for unchanged files between versions are ordinary
// files to `lstat` and pass.
//
// `assertNoSymlinksOnDisk` walks a folder with `lstat` (never following a
// link): before mirroring into a folder main filled (an update's hardlinked
// copy, which could carry a link an import before this fix let in) and after
// every mirror, in case a library changes how it writes.
//
// No Bare specifics: `fsp` and `path` are passed in (bare-fs / bare-path in
// the worker, node:fs / node:path in drive-safety.test.mjs).

const Localdrive = require('localdrive')

// A worker error main passes on with its code (electron/bare-worker.ts).
function symlinkRefused(where) {
  return Object.assign(new Error(`This code is not a course: it links to files outside it (${where})`), {
    code: 'SYMLINK_REFUSED',
  })
}

class NoSymlinkLocaldrive extends Localdrive {
  async symlink(key) {
    throw symlinkRefused(key)
  }
}

// The first symlink under `dir` (relative path), or null. A missing `dir` has none.
async function findSymlinkOnDisk(fsp, path, dir) {
  const pending = ['']
  while (pending.length > 0) {
    const relative = pending.pop()
    let names
    try {
      names = await fsp.readdir(path.join(dir, relative))
    } catch (error) {
      if (relative === '' && error.code === 'ENOENT') return null
      throw error
    }
    for (const name of names) {
      const child = relative ? path.join(relative, name) : name
      const stat = await fsp.lstat(path.join(dir, child))
      if (stat.isSymbolicLink()) return child
      if (stat.isDirectory()) pending.push(child)
    }
  }
  return null
}

async function assertNoSymlinksOnDisk(fsp, path, dir) {
  const found = await findSymlinkOnDisk(fsp, path, dir)
  if (found !== null) throw symlinkRefused(found)
}

module.exports = { NoSymlinkLocaldrive, assertNoSymlinksOnDisk, findSymlinkOnDisk }
