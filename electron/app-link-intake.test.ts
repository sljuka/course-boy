import { describe, expect, it, vi } from 'vitest'

import { appImageDesktopEntry, createAppLinkQueue, findAppLinkInArgv, isAcceptableAppLink } from './app-link-intake'

// SLJ-8: links reaching the app from outside it.
describe('findAppLinkInArgv', () => {
  it('finds the link among a launch’s arguments, wherever it is', () => {
    expect(findAppLinkInArgv(['/opt/Matko/matko', '--no-sandbox', 'matko://import/abc'])).toBe('matko://import/abc')
    expect(findAppLinkInArgv(['C:\\Matko\\Matko.exe', 'MATKO://import/abc'])).toBe('MATKO://import/abc')
    expect(findAppLinkInArgv(['/opt/Matko/matko', '--user-data-dir=/tmp/x', '.'])).toBeNull()
  })

  // SLJ-151: a crafted link can't carry anything along, and nothing else in
  // a launch's arguments is ever taken.
  it('takes only a plain link, never one carrying more', () => {
    for (const crafted of [
      'matko://import/abc" --inspect=9229',
      'matko://import/abc --user-data-dir=/tmp/evil',
      'matko://import/abc?then=x',
      'matko://import/abc#x',
      'matko://import/%22abc',
      'matko://import/abc\n--x',
      `matko://import/${'a'.repeat(600)}`,
      'matko://',
    ]) {
      expect(isAcceptableAppLink(crafted)).toBe(false)
    }
    expect(
      findAppLinkInArgv(['C:\\Matko\\Matko.exe', '--profile=other', 'matko://import/abc" --inspect=9229']),
    ).toBeNull()
    expect(isAcceptableAppLink('matko://course/thys2vej6my5mpxt/lesson/lesson-01')).toBe(true)
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

  it('drops a link that is not plain', () => {
    const notify = vi.fn()
    const queue = createAppLinkQueue(notify)
    queue.add({ newTab: false, url: 'matko://import/abc" --inspect' })
    queue.add({ newTab: false, url: 'https://example.com' })
    expect(queue.take()).toEqual([])
    expect(notify).not.toHaveBeenCalled()
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
