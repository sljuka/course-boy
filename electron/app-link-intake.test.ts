import { describe, expect, it, vi } from 'vitest'

import { appImageDesktopEntry, createAppLinkQueue, findAppLinkInArgv } from './app-link-intake'

// SLJ-8: links reaching the app from outside it.
describe('findAppLinkInArgv', () => {
  it('finds the link among a launch’s arguments, wherever it is', () => {
    expect(findAppLinkInArgv(['/opt/Matko/matko', '--no-sandbox', 'matko://import/abc'])).toBe('matko://import/abc')
    expect(findAppLinkInArgv(['C:\\Matko\\Matko.exe', 'MATKO://import/abc'])).toBe('MATKO://import/abc')
    expect(findAppLinkInArgv(['/opt/Matko/matko', '--user-data-dir=/tmp/x', '.'])).toBeNull()
  })
})

describe('createAppLinkQueue', () => {
  it('keeps links until taken, once each, and says when one arrives', () => {
    const notify = vi.fn()
    const queue = createAppLinkQueue(notify)
    queue.add({ newTab: false, url: 'matko://import/a' })
    queue.add({ newTab: true, url: 'matko://lesson/b' })
    expect(notify).toHaveBeenCalledTimes(2)
    expect(queue.take()).toEqual([
      { newTab: false, url: 'matko://import/a' },
      { newTab: true, url: 'matko://lesson/b' },
    ])
    expect(queue.take()).toEqual([])
  })

  it('keeps only the last few', () => {
    const queue = createAppLinkQueue(() => {})
    for (let index = 0; index < 15; index += 1) queue.add({ newTab: false, url: `matko://lesson/l${index}` })
    expect(queue.take().map((request) => request.url)).toEqual(
      Array.from({ length: 10 }, (_, index) => `matko://lesson/l${index + 5}`),
    )
  })
})

describe('appImageDesktopEntry', () => {
  it('opens matko:// links with the AppImage, its path quoted', () => {
    const entry = appImageDesktopEntry('/home/ana/Apps/Matko "new".AppImage')
    expect(entry).toContain('Exec="/home/ana/Apps/Matko \\"new\\".AppImage" %u')
    expect(entry).toContain('MimeType=x-scheme-handler/matko;')
  })
})
