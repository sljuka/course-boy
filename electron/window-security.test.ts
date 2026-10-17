import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }))

import { shell } from 'electron'
import { classifyUrl, lockDownWindow } from './window-security'

const builtApp = ['file:///Applications/Matko.app/Contents/Resources/app/dist/index.html']
const devApp = ['http://localhost:5173/']

describe('classifyUrl', () => {
  it("treats the built app's index.html, at any route, as the app", () => {
    expect(classifyUrl('file:///Applications/Matko.app/Contents/Resources/app/dist/index.html', builtApp)).toBe('app')
    expect(
      classifyUrl('file:///Applications/Matko.app/Contents/Resources/app/dist/index.html#/courses/abc', builtApp),
    ).toBe('app')
  })

  it('treats anything the dev server serves as the app', () => {
    expect(classifyUrl('http://localhost:5173/#/my-courses', devApp)).toBe('app')
  })

  it('sends other web pages to the browser, never into the window', () => {
    expect(classifyUrl('https://example.com/', builtApp)).toBe('external')
    expect(classifyUrl('http://localhost:9999/', devApp)).toBe('external')
  })

  it('marks links to course content for the app to open (SLJ-60)', () => {
    expect(classifyUrl('matko://course/thys2vej6my5mpxt', builtApp)).toBe('app-link')
    expect(classifyUrl('matko://lesson/lesson-01', devApp)).toBe('app-link')
  })

  it('blocks other files on disk and every other scheme', () => {
    expect(classifyUrl('file:///etc/passwd', builtApp)).toBe('blocked')
    expect(classifyUrl('file:///Applications/Matko.app/Contents/Resources/app/dist/other.html', builtApp)).toBe(
      'blocked',
    )
    expect(classifyUrl('javascript:alert(1)', builtApp)).toBe('blocked')
    expect(classifyUrl('data:text/html,<p>hi</p>', builtApp)).toBe('blocked')
    expect(classifyUrl('not a url', builtApp)).toBe('blocked')
  })
})

// A window's contents, keeping the handlers lockDownWindow installs.
function fakeWindow() {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  let openHandler: (details: { disposition: string; url: string }) => { action: string } = () => ({ action: '' })
  const contents = {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    },
    setWindowOpenHandler: (handler: typeof openHandler) => {
      openHandler = handler
    },
  }
  return {
    navigate: (url: string) => {
      const event = { preventDefault: vi.fn() }
      handlers['will-navigate'](event, url)
      return event.preventDefault.mock.calls.length > 0
    },
    open: (url: string, disposition = 'foreground-tab') => openHandler({ disposition, url }),
    win: { webContents: contents } as never,
  }
}

describe('lockDownWindow', () => {
  it('hands course links to the app, in a new tab for ⌘-click, and never loads them', () => {
    vi.mocked(shell.openExternal).mockClear()
    const window = fakeWindow()
    const onAppLink = vi.fn()
    lockDownWindow(window.win, builtApp, onAppLink)

    expect(window.open('matko://lesson/lesson-01')).toEqual({ action: 'deny' })
    expect(window.open('matko://lesson/lesson-02', 'background-tab')).toEqual({ action: 'deny' })
    expect(window.navigate('matko://course/thys2vej6my5mpxt')).toBe(true)
    expect(onAppLink.mock.calls).toEqual([
      ['matko://lesson/lesson-01', { newTab: false }],
      ['matko://lesson/lesson-02', { newTab: true }],
      ['matko://course/thys2vej6my5mpxt', { newTab: false }],
    ])
    // Never to the system (SLJ-151): Matko is the system's handler for
    // `matko://`, so it would come back as a second launch, maybe in a loop.
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})
