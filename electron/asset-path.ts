// Where a `matko-asset://` request may read from (SLJ-150): a regular file
// whose real path, symlinks resolved, is inside the assets folder it was asked
// from. A course comes from whoever published it, and an asset that is a
// symlink (to `~/.ssh/id_rsa`, say) must not be served. Imports refuse
// symlinks (workers/drive-safety.cjs); this is the same rule where files are
// read, also for a course that landed before that.

import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'

function isInside(folder: string, target: string): boolean {
  const relative = path.relative(folder, target)
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

// The real path of `filename` in `folder`, or null when it's missing, not a
// regular file, or (through a symlink) somewhere else.
export async function resolveAssetInside(folder: string, filename: string): Promise<string | null> {
  try {
    const realFolder = await realpath(folder)
    const realFile = await realpath(path.join(folder, filename))
    if (!isInside(realFolder, realFile)) return null
    return (await stat(realFile)).isFile() ? realFile : null
  } catch {
    return null
  }
}
