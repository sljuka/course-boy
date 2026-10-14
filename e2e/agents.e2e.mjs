// SLJ-68: agents make courses over MCP. In the real app: Settings → Agents
// turns the server on and shows its address and access code; an MCP client
// (as Claude Code would be) builds a course with a lesson, its test and a
// section test, commits it and puts it in a program; the open window shows
// what the agent made without a reload. After a restart the server is back on
// the same address and code; a new code cuts the old one off; turned off,
// nothing connects.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterAll, describe, expect, it } from 'vitest'
import { recordFailures } from './failures.mjs'
import { launchApp, waitForText } from './launch.mjs'

const USER_DATA = '/tmp/matko-e2e-agents'
let harness = null
recordFailures(import.meta.filename, () => ({ app: harness }))

afterAll(async () => {
  await harness?.close()
})

async function openSettings(page) {
  await page.evaluate(() => {
    location.hash = '#/settings'
  })
  await page.locator('[data-testid="agents-settings"]').waitFor()
}

async function connection(page) {
  await page.locator('[data-testid="settings-agents-connection"]').waitFor()
  return {
    token: await page.locator('[data-testid="settings-agents-token"]').inputValue(),
    url: await page.locator('[data-testid="settings-agents-url"]').inputValue(),
  }
}

async function connect({ token, url }) {
  const client = new Client({ name: 'e2e', version: '1' })
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}

async function call(client, name, args = {}) {
  const response = await client.callTool({ arguments: args, name })
  const text = response.content[0].text
  if (response.isError) throw new Error(text)
  return JSON.parse(text)
}

describe('agents (MCP)', () => {
  let saved

  it('turns on in Settings, and an agent makes a course and a program the window shows', async () => {
    harness = await launchApp({ userData: USER_DATA })
    const { page } = harness
    await page.evaluate(() => window.preferences.set({ category: 'other', nickname: 'E2E', persona: 'course-boy', role: 'teacher' }))
    await page.reload()

    // Off until turned on.
    await openSettings(page)
    expect(await page.locator('[data-testid="settings-agents-connection"]').count()).toBe(0)
    await page.locator('[data-testid="settings-agents-enabled"]').click()
    saved = await connection(page)
    expect(saved.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/)
    expect(await page.locator('[data-testid="settings-agents-command"]').inputValue()).toBe(
      `claude mcp add --transport http matko ${saved.url} --header "Authorization: Bearer ${saved.token}"`,
    )

    // My courses open while the agent works.
    await page.evaluate(() => {
      location.hash = '#/my-courses'
    })
    const client = await connect(saved)
    const { courseId } = await call(client, 'create_course', { description: 'Made by an agent', title: 'E2E Agent Course' })
    const { sectionId } = await call(client, 'create_section', { courseId, title: 'Addition' })
    const { lessonId } = await call(client, 'create_lesson', {
      content: '## Two numbers\n\nPut them together, the agent says.',
      courseId,
      sectionId,
      title: 'Adding up',
    })
    await call(client, 'set_lesson_test', {
      courseId,
      lessonId,
      questions: [{ correct: [1], options: ['3', '4'], prompt: 'What is 2 + 2?', type: 'multiple_choice' }],
      sectionId,
    })
    await call(client, 'create_section_test', {
      courseId,
      questions: [{ answer: 'a + b', prompt: 'What is {{a}} + {{b}}?', type: 'number', variables: { a: { max: 5, min: 1 }, b: { max: 5, min: 1 } } }],
      sectionId,
      title: 'Review',
    })
    await waitForText(page, 'E2E Agent Course')

    // A version the app accepts, and a program with the course.
    const { version } = await call(client, 'commit_version', { courseId, notes: 'Written by an agent' })
    const history = await page.evaluate((id) => window.courses.getVersionHistory(id), courseId)
    expect(JSON.stringify(history)).toContain(version)
    const { programId } = await call(client, 'create_program', { title: 'E2E Agent Program' })
    await call(client, 'update_program', { courseIds: [courseId], programId })
    expect((await page.evaluate((id) => window.programs.get(id), programId)).courses.map((course) => course.courseId)).toEqual([courseId])
    await client.close()

    // What the student sees: the lesson the agent wrote.
    await page.evaluate(({ courseId, lessonId }) => {
      location.hash = `#/courses/${courseId}/lessons/${lessonId}`
    }, { courseId, lessonId })
    await waitForText(page, 'Put them together, the agent says.')
  }, 120_000)

  it('is back after a restart on the same address and code; a new code cuts the old one off; turned off, nothing connects', async () => {
    await harness.close()
    harness = await launchApp({ fresh: false, userData: USER_DATA })
    const { page } = harness
    await openSettings(page)
    expect(await connection(page)).toEqual(saved)
    await (await connect(saved)).close()

    await page.locator('[data-testid="settings-agents-new-token"]').click()
    await expect.poll(() => page.locator('[data-testid="settings-agents-token"]').inputValue()).not.toBe(saved.token)
    await expect(connect(saved)).rejects.toThrow()
    const fresh = await connection(page)
    await (await connect(fresh)).close()

    await page.locator('[data-testid="settings-agents-enabled"]').click()
    await page.locator('[data-testid="settings-agents-connection"]').waitFor({ state: 'detached' })
    await expect(connect(fresh)).rejects.toThrow()
  }, 120_000)
})
