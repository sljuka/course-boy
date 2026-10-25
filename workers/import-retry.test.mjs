import { describe, expect, it, vi } from 'vitest'
import { isRetryableDownloadError, withDownloadRetries } from './import-retry.cjs'

// SLJ-173: a download that loses its connection tries again; an answer about
// the course or the device doesn't.
const sleep = () => Promise.resolve()
const failure = (code, message = code) => Object.assign(new Error(message), code ? { code } : {})

describe('withDownloadRetries', () => {
  it('lands on a later attempt after connection trouble, saying so before each', async () => {
    const onRetry = vi.fn()
    let calls = 0
    const result = await withDownloadRetries(
      async (attempt) => {
        calls += 1
        if (attempt < 3) throw failure('REQUEST_TIMEOUT')
        return 'landed'
      },
      { onRetry, sleep },
    )
    expect(result).toBe('landed')
    expect(calls).toBe(3)
    expect(onRetry.mock.calls.map(([attempt]) => attempt)).toEqual([2, 3])
  })

  it('gives up after the last attempt with the last error', async () => {
    let calls = 0
    await expect(
      withDownloadRetries(
        async () => {
          calls += 1
          throw failure(undefined, 'Timed out reading /course.json')
        },
        { sleep },
      ),
    ).rejects.toThrow('Timed out reading /course.json')
    expect(calls).toBe(3)
  })

  it("doesn't try again after an answer, or once cancelled", async () => {
    for (const code of ['COURSE_TOO_BIG', 'TOO_MANY_FILES', 'NOT_ENOUGH_SPACE', 'SYMLINK_REFUSED', 'CANCELLED']) {
      let calls = 0
      await expect(
        withDownloadRetries(
          async () => {
            calls += 1
            throw failure(code)
          },
          { sleep },
        ),
      ).rejects.toThrow(code)
      expect(calls).toBe(1)
    }

    let cancelled = false
    let calls = 0
    await expect(
      withDownloadRetries(
        async () => {
          calls += 1
          throw failure('REQUEST_TIMEOUT')
        },
        {
          isCancelled: () => cancelled,
          sleep: async () => {
            cancelled = true
          },
        },
      ),
    ).rejects.toThrow('REQUEST_TIMEOUT')
    expect(calls).toBe(1)
  })
})

describe('isRetryableDownloadError', () => {
  it('retries connection trouble, not answers', () => {
    expect(isRetryableDownloadError(failure('REQUEST_TIMEOUT'))).toBe(true)
    expect(isRetryableDownloadError(failure(undefined, 'Nobody sharing this course is online'))).toBe(true)
    expect(isRetryableDownloadError(failure('NOT_MATKO'))).toBe(false)
  })
})
