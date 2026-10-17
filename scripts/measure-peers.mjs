#!/usr/bin/env node
// Measures what "Peers online" shows a teacher when many students have a
// course (SLJ-51, SLJ-149 groundwork). Nothing touches the public network: it
// runs a local DHT testnet (`hyperdht/testnet`), one teacher and N students,
// each with its own Hyperswarm and Corestore set up the way workers/main.cjs
// sets them up:
//
// - the teacher seeds the course: `swarm.join(key, { server: true, client: false })`
// - a student follows it: `swarm.join(key)` (client and server), replicating
//   every connection, so students also pass the course on to each other
//
// and records, every few seconds, the teacher's count (`drive.core.peers.length`,
// what CMD_GET_PEERS returns) next to how many students are online and how many
// of them got the course.
//
//   node scripts/measure-peers.mjs [students=25] [--per-process=25] [--hold=60]
//
// Students join in waves of one process each and stay `--hold` seconds after
// the last wave. Each process holds `--per-process` students. Prints a table
// and writes the samples to /tmp/matko-measure-peers-<students>.json.

import { fork } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import createTestnet from 'hyperdht/testnet.js'
import Hyperswarm from 'hyperswarm'

const ROOT = '/tmp/matko-measure-peers'
const SAMPLE_MS = 3_000
const WAVE_MS = 15_000

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const found = args.find((arg) => arg.startsWith(`--${name}=`))
  return found ? Number(found.split('=')[1]) : fallback
}

if (args[0] === '--students-process') {
  await runStudents(JSON.parse(args[1]))
} else {
  await runTeacher({
    hold: option('hold', 60),
    perProcess: option('per-process', 25),
    students: Number(args.find((arg) => !arg.startsWith('--')) ?? 25),
  })
}

// One process of students: each its own swarm and store, like separate
// computers. Reports how many are online and how many have the course.
async function runStudents({ bootstrap, count, dir, driveKey }) {
  const students = []
  for (let index = 0; index < count; index++) {
    const store = new Corestore(path.join(dir, String(index)))
    const swarm = new Hyperswarm({ bootstrap, keyPair: await store.createKeyPair('swarm') })
    swarm.on('connection', (conn) => store.replicate(conn))
    const drive = new Hyperdrive(store.session(), Buffer.from(driveKey, 'hex'))
    await drive.ready()
    swarm.join(drive.discoveryKey)
    const student = { drive, hasCourse: false, store, swarm }
    // Until a peer has sent it, like the app's import (peekCourse).
    void (async () => {
      while (!student.hasCourse && !swarm.destroyed) {
        if (drive.core.peers.length > 0) await drive.update({ wait: true }).catch(() => {})
        if (drive.core.length > 0) {
          student.hasCourse = Boolean(await drive.get('/course.json', { wait: true }).catch(() => null))
        }
        if (!student.hasCourse) await new Promise((resolve) => setTimeout(resolve, 250))
      }
    })()
    students.push(student)
  }

  const report = () =>
    process.send({
      connections: students.reduce((sum, { swarm }) => sum + swarm.connections.size, 0),
      online: students.length,
      rssMb: Math.round(process.memoryUsage().rss / 2 ** 20),
      withCourse: students.filter(({ hasCourse }) => hasCourse).length,
    })
  report()
  const timer = setInterval(report, SAMPLE_MS / 2)

  process.on('message', async (message) => {
    if (message !== 'stop') return
    clearInterval(timer)
    await Promise.all(students.map(async ({ store, swarm }) => {
      await swarm.destroy().catch(() => {})
      await store.close().catch(() => {})
    }))
    process.exit(0)
  })
}

async function runTeacher({ hold, perProcess, students }) {
  fs.rmSync(ROOT, { force: true, recursive: true })
  fs.mkdirSync(ROOT, { recursive: true })
  const testnet = await createTestnet(5)
  const bootstrap = testnet.bootstrap

  const store = new Corestore(path.join(ROOT, 'teacher'))
  const swarm = new Hyperswarm({ bootstrap, keyPair: await store.createKeyPair('swarm') })
  swarm.on('connection', (conn) => store.replicate(conn))
  const drive = new Hyperdrive(store.session())
  await drive.put('/course.json', Buffer.from(JSON.stringify({ id: 'measure-peers', title: 'Peers at scale' })))
  swarm.join(drive.discoveryKey, { client: false, server: true })
  await swarm.flush()

  const processes = []
  const latest = new Map()
  const samples = []
  const started = Date.now()
  const total = () => {
    const sum = { connections: 0, online: 0, rssMb: 0, withCourse: 0 }
    for (const report of latest.values()) for (const key of Object.keys(sum)) sum[key] += report[key]
    return sum
  }

  console.log(`${students} students in processes of ${perProcess}, a wave every ${WAVE_MS / 1000}s, then ${hold}s.`)
  console.log('  time  online  with course  teacher sees  teacher conns  avg student conns       memory')
  const sample = () => {
    const { connections, online, rssMb, withCourse } = total()
    const row = {
      averageStudentConnections: online ? Math.round((connections / online) * 10) / 10 : 0,
      // The teacher's process and every student process together.
      memoryMb: rssMb + Math.round(process.memoryUsage().rss / 2 ** 20),
      online,
      seconds: Math.round((Date.now() - started) / 1000),
      teacherConnections: swarm.connections.size,
      teacherSees: drive.core.peers.length,
      withCourse,
    }
    samples.push(row)
    console.log(
      [
        `${row.seconds}s`.padStart(6),
        String(online).padStart(7),
        String(withCourse).padStart(12),
        String(row.teacherSees).padStart(13),
        String(row.teacherConnections).padStart(14),
        String(row.averageStudentConnections).padStart(18),
        `${row.memoryMb} MB`.padStart(12),
      ].join(''),
    )
  }
  const timer = setInterval(sample, SAMPLE_MS)

  const self = fileURLToPath(import.meta.url)
  for (let first = 0; first < students; first += perProcess) {
    const count = Math.min(perProcess, students - first)
    const child = fork(self, [
      '--students-process',
      JSON.stringify({ bootstrap, count, dir: path.join(ROOT, `students-${first}`), driveKey: drive.key.toString('hex') }),
    ])
    child.on('message', (report) => latest.set(child.pid, report))
    processes.push(child)
    if (first + perProcess < students) await new Promise((resolve) => setTimeout(resolve, WAVE_MS))
  }

  await new Promise((resolve) => setTimeout(resolve, hold * 1000))
  clearInterval(timer)
  sample()

  // Outside ROOT, which is removed below.
  const file = `/tmp/matko-measure-peers-${students}.json`
  fs.writeFileSync(file, JSON.stringify(samples, null, 2))
  console.log(`Samples: ${file}`)

  await Promise.all(
    processes.map((child) => new Promise((resolve) => {
      child.once('exit', resolve)
      child.send('stop')
      setTimeout(() => child.kill(), 10_000)
    })),
  )
  await swarm.destroy()
  await store.close()
  await testnet.destroy()
  fs.rmSync(ROOT, { force: true, recursive: true })
}
