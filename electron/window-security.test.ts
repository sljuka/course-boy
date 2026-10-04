import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }))

import { classifyUrl } from './window-security'

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
