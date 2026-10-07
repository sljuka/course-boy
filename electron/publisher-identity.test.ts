import { describe, expect, it, vi } from 'vitest'

import { createPublisherIdentity } from './publisher-identity'

const publisherIdOf = (key: Buffer) => `publisher-${key.subarray(0, 4).toString('hex')}`

function workerError(code: string) {
  return Object.assign(new Error(code), { code })
}

// The identity file as the worker would seal it, here readable: the public
// part (publisherId) and the key with the password it opens with.
function sealed(key: Buffer, password: string) {
  return JSON.stringify({ format: 'matko-identity', key: key.toString('base64'), password, publisherId: publisherIdOf(key) })
}

function setup() {
  let text: string | null = null
  let handedOver: Buffer | null = null
  const deps = {
    file: { read: () => text, write: (next: string) => (text = next) },
    randomKey: () => Buffer.alloc(32, 1),
    worker: {
      openIdentity: vi.fn(async (file: string, password: string) => {
        const { key, password: expected } = JSON.parse(file)
        if (password !== expected) throw workerError('WRONG_PASSWORD')
        const identity = Buffer.from(key, 'base64')
        return { key: identity, publisherId: publisherIdOf(identity) }
      }),
      sealIdentity: vi.fn(async (key: Buffer, password: string) => sealed(key, password)),
      setIdentity: vi.fn(async (key: Buffer | null) => {
        handedOver = key ? Buffer.from(key) : null
        return key ? publisherIdOf(key) : null
      }),
    },
  }

  return {
    deps,
    file: () => text,
    handedOver: () => handedOver,
    // The app starting again: a new service on the same file.
    restart: () => createPublisherIdentity(deps),
    service: createPublisherIdentity(deps),
  }
}

describe('publisher identity', () => {
  it('has none until the setup wizard creates one, locked with the password, and unlocked', async () => {
    const { file, handedOver, service } = setup()

    expect(service.exists()).toBe(false)
    expect(service.getStatus()).toEqual({ askBeforeHome: false, exists: false, locked: false, publisherId: null })

    expect(await service.setUp('correct horse')).toEqual({ ok: true })
    const identity = Buffer.alloc(32, 1)
    expect(handedOver()?.equals(identity)).toBe(true)
    expect(file()).toBe(sealed(identity, 'correct horse'))
    expect(service.getStatus()).toEqual({
      askBeforeHome: false,
      exists: true,
      locked: false,
      publisherId: publisherIdOf(identity),
    })

    expect(await service.setUp('another password')).toEqual({ error: 'exists' })
  })

  it('refuses a short password', async () => {
    const { file, service } = setup()
    expect(await service.setUp('short')).toEqual({ error: 'weakPassword' })
    expect(file()).toBeNull()
  })

  it('starts locked: asks before Home, the publisher id still shows, the password unlocks it', async () => {
    const { deps, handedOver, restart, service } = setup()
    await service.setUp('correct horse')

    const next = restart()
    expect(next.isLocked()).toBe(true)
    expect(next.getStatus()).toMatchObject({ askBeforeHome: true, locked: true, publisherId: publisherIdOf(Buffer.alloc(32, 1)) })

    deps.worker.setIdentity.mockClear()
    expect(await next.unlock('wrong')).toEqual({ error: 'wrongPassword' })
    expect(deps.worker.setIdentity).not.toHaveBeenCalled()

    expect(await next.unlock('correct horse')).toEqual({ unlocked: true })
    expect(handedOver()?.equals(Buffer.alloc(32, 1))).toBe(true)
    expect(next.getStatus()).toMatchObject({ askBeforeHome: false, locked: false })
  })

  it('"Open without publishing" stops asking before Home but stays locked', async () => {
    const { restart, service } = setup()
    await service.setUp('correct horse')

    const next = restart()
    next.openWithoutPublishing()
    expect(next.getStatus()).toMatchObject({ askBeforeHome: false, locked: true })
  })

  it('installs a restored identity file as it is, unlocked', async () => {
    const { file, handedOver, service } = setup()
    const restored = Buffer.alloc(32, 9)
    const text = sealed(restored, 'old password')

    await service.install(text, restored)
    expect(handedOver()?.equals(restored)).toBe(true)
    expect(file()).toBe(text)
    expect(service.getStatus()).toMatchObject({ exists: true, locked: false, publisherId: publisherIdOf(restored) })

    // The key must be the one the file names.
    await expect(service.install(text, Buffer.alloc(32, 3))).rejects.toThrow(/doesn't match/)
  })

  it("checks a password without unlocking the identity", async () => {
    const { restart, service } = setup()
    await service.setUp('correct horse')

    const next = restart()
    expect(await next.checkPassword('wrong')).toBe(false)
    expect(await next.checkPassword('correct horse')).toBe(true)
    expect(next.isLocked()).toBe(true)
  })
})
