import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import createTestnet from 'hyperdht/testnet.js'
import Hyperswarm from 'hyperswarm'
import { connectionFirewall, limitConnections } from './connection-limit.cjs'

// A computer holds at most so many connections; one it refused for being full
// is welcome again once there's room.

describe('connectionFirewall', () => {
  const swarmWith = (size) => ({ connections: { size } })

  it('lets peers in until the limit, then refuses them', () => {
    let swarm = swarmWith(1)
    const firewall = connectionFirewall({ getSwarm: () => swarm, max: 2 })
    expect(firewall(Buffer.alloc(32))).toBe(false)
    swarm = swarmWith(2)
    expect(firewall(Buffer.alloc(32))).toBe(true)
  })

  it('always lets vetted peers in', () => {
    const vetted = Buffer.alloc(32, 1)
    const firewall = connectionFirewall({
      getSwarm: () => swarmWith(5),
      isVetted: (key) => key.equals(vetted),
      max: 2,
    })
    expect(firewall(vetted)).toBe(false)
    expect(firewall(Buffer.alloc(32, 2))).toBe(true)
  })
})

describe('limitConnections with real swarms', () => {
  const topic = Buffer.alloc(32, 7)
  let testnet
  const swarms = []

  function makeSwarm(options = {}) {
    const swarm = new Hyperswarm({ bootstrap: testnet.bootstrap, ...options })
    swarm.on('connection', (conn) => conn.on('error', () => {}))
    swarms.push(swarm)
    return swarm
  }

  async function until(check, timeout = 20_000) {
    const deadline = Date.now() + timeout
    while (!check()) {
      if (Date.now() > deadline) throw new Error('Timed out')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  beforeAll(async () => {
    testnet = await createTestnet(3)
  })

  afterAll(async () => {
    for (const swarm of swarms) await swarm.destroy()
    await testnet.destroy()
  })

  it('refuses the peer that would go over the limit, and takes it once there is room', async () => {
    const limit = limitConnections({ max: 2 })
    const teacher = limit.attach(makeSwarm({ firewall: limit.firewall }))
    await teacher.join(topic, { client: false, server: true }).flushed()

    // Students that only connect to the teacher, like a fresh import.
    const students = [makeSwarm(), makeSwarm(), makeSwarm()]
    for (const student of students.slice(0, 2)) await student.join(topic, { client: true, server: false }).flushed()
    await until(() => teacher.connections.size === 2)

    const third = students[2]
    third.join(topic, { client: true, server: false })
    await third.flush()
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    expect(teacher.connections.size).toBe(2)
    expect(third.connections.size).toBe(0)

    // One student leaves: the third gets in, it wasn't banned for good.
    await students[0].destroy()
    await until(() => third.connections.size === 1)
    expect(teacher.connections.size).toBe(2)
  }, 60_000)
})
