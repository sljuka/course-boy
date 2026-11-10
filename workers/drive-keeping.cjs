// Keeping a drive (SLJ-144): a full copy of its current version in this
// computer's store, so a seeder can serve a course, program or channel to
// students while its publisher's computer is off.
//
// Following a drive (`followCourse` in main.cjs) isn't enough for that: a
// follower holds only what it downloaded for itself, which for a student is
// the files of their import, and for a seeder nothing at all. The spike on
// SLJ-144 showed it: a follow-only seeder left a new student's import waiting
// forever once the teacher quit; a seeder holding a full copy served it at
// once, and each new version after it fetched that version again.
//
// Unlike an import or an applied update, nothing is unpacked into a folder:
// the blocks stay in the store, which is all a seeder needs to serve them.
//
// No Bare specifics: tested in vitest (drive-keeping.test.mjs).

// The current version's files that have a body (an empty file has none).
async function* filesOf(drive) {
  for await (const entry of drive.list('/', { recursive: true })) {
    if (entry.value.blob) yield entry
  }
}

// Paths of the current version's files whose blocks this computer doesn't
// have (all of them, every block).
async function missingFiles(drive) {
  const blobs = await drive.getBlobs()
  const missing = []
  for await (const entry of filesOf(drive)) {
    const { blockLength, blockOffset } = entry.value.blob
    if (blockLength > 0 && !(await blobs.core.has(blockOffset, blockOffset + blockLength))) missing.push(entry.key)
  }
  return missing
}

// Downloads every file of the newest version any connected peer has. Works on
// that version, fixed when it starts: a version published meanwhile is the
// next call's (the caller runs it again on the next change). Resolves to the
// version kept and its number of files; throws if a file is still missing
// afterwards (a peer that left mid-way), so the caller tries again later.
async function keepCurrentVersion(drive) {
  await drive.ready()
  await drive.update({ wait: true })
  const version = drive.version
  const snapshot = drive.checkout(version)
  try {
    const download = snapshot.download('/', { recursive: true })
    await download.done()
    const missing = await missingFiles(snapshot)
    if (missing.length > 0) {
      throw Object.assign(new Error(`${missing.length} file(s) of version ${version} could not be downloaded`), {
        code: 'INCOMPLETE',
      })
    }
    let files = 0
    for await (const _entry of filesOf(snapshot)) files++
    return { files, version }
  } finally {
    await snapshot.close()
  }
}

module.exports = { keepCurrentVersion, missingFiles }
