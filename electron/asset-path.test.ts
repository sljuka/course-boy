import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { resolveAssetInside } from './asset-path'

// SLJ-150: assets are served only from inside their folder.
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'matko-asset-path-')))
const assets = path.join(root, 'course', 'assets')
const secret = path.join(root, 'secret.png')

fs.mkdirSync(path.join(assets, 'folder'), { recursive: true })
fs.writeFileSync(path.join(assets, 'photo.png'), 'png')
fs.writeFileSync(secret, 'not for the course')
fs.symlinkSync(secret, path.join(assets, 'linked-out.png'))
fs.symlinkSync(path.join(assets, 'photo.png'), path.join(assets, 'linked-in.png'))

afterAll(() => fs.rmSync(root, { force: true, recursive: true }))

describe('resolveAssetInside', () => {
  it('serves a regular file in the folder', async () => {
    expect(await resolveAssetInside(assets, 'photo.png')).toBe(path.join(assets, 'photo.png'))
  })

  it('refuses a symlink that leads outside the folder', async () => {
    expect(await resolveAssetInside(assets, 'linked-out.png')).toBeNull()
  })

  it('serves a symlink that stays inside the folder as the file it points to', async () => {
    expect(await resolveAssetInside(assets, 'linked-in.png')).toBe(path.join(assets, 'photo.png'))
  })

  it('refuses folders, missing files and paths that climb out', async () => {
    expect(await resolveAssetInside(assets, 'folder')).toBeNull()
    expect(await resolveAssetInside(assets, 'missing.png')).toBeNull()
    expect(await resolveAssetInside(assets, '../../secret.png')).toBeNull()
  })
})
