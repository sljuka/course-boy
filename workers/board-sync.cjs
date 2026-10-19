// Course boards between devices (SLJ-149): a `matko-board/1` Protomux
// channel per board on every connection the worker already has, next to
// Hypercore's own channels.
//
// A channel's id is a hash of the course's drive key, so only a device that
// has the course can open its board's channel; others see an id they can't
// tell anything from. Both sides open a channel for every board they have,
// and the ones both have pair up. A board opened later (a course imported
// while connected) opens its channel then; the other side, which had given up
// on it, opens its own when asked (`mux.pair`).
//
// On a channel:
//
// 1. Each side says hello: the ids of its newest messages, how much it keeps
//    (its limit) and which moderation list it has (`seq`).
// 2. Each sends the other a newer moderation list if it has one, and the
//    messages the other is missing among its newest, up to the other's
//    limit. While the board is off (no list turning it on yet), only the
//    list travels.
// 3. After that, a message or list new to this device is passed on to every
//    other device it's connected to for that board, so it reaches students
//    who never connect to the sender.
// 4. "Older than X, up to N": what scrolling past the end asks connected
//    devices for (in practice the teacher's). Read, not kept.
//
// Everything received is checked as if from a stranger: messages and lists
// by board-messages.cjs, blocked senders and the rate limit by
// board-store.cjs.

const Protomux = require('protomux')
const sodium = require('sodium-native')
const {
  DEFAULT_STUDENT_LIMIT_BYTES,
  createMessage,
  createModeration,
  messageId,
  messageProblem,
  verifiedModeration,
} = require('./board-messages.cjs')
const { openBoardStore } = require('./board-store.cjs')

const PROTOCOL = 'matko-board/1'
// How many of its newest message ids a device lists in its hello.
const HELLO_IDS = 1000
// At most this many messages in one frame, and in one catch-up.
const MESSAGES_PER_FRAME = 100
const MAX_CATCH_UP_MESSAGES = 5000
// A frame larger than this is refused (a moderation list at its largest is
// about 300 KB).
const MAX_FRAME_BYTES = 512 * 1024
// "Older" pages: at most this many messages, and this long to wait.
const MAX_OLDER_PAGE = 200
const OLDER_TIMEOUT_MS = 5000
// What the teacher's device keeps unless they choose otherwise.
const DEFAULT_TEACHER_LIMIT_BYTES = 100 * 1024 * 1024

// JSON in a frame, at most MAX_FRAME_BYTES; anything else decodes to null.
const json = {
  preencode(state, value) {
    state.end += Buffer.byteLength(JSON.stringify(value))
  },
  encode(state, value) {
    state.start += state.buffer.write(JSON.stringify(value), state.start)
  },
  decode(state) {
    const bytes = state.buffer.subarray(state.start, state.end)
    state.start = state.end
    if (bytes.length > MAX_FRAME_BYTES) return null
    try {
      return JSON.parse(bytes.toString())
    } catch {
      return null
    }
  },
}

function channelId(boardKey) {
  const out = Buffer.alloc(32)
  sodium.crypto_generichash_batch(out, [Buffer.from('matko-board-channel'), boardKey])
  return out
}

function isBefore(value) {
  return value && Number.isSafeInteger(value.date) && typeof value.id === 'string'
}

// `folder`: where the boards' files go. `onChange(boardKeyHex)`: a board's
// messages or moderation list changed (main tells the window).
function createBoards({ folder, fs, now = () => Date.now(), onChange = () => {} }) {
  const boards = new Map() // hex board key -> board
  const boardsByChannel = new Map() // hex channel id -> board
  const muxes = new Set()
  let olderRequests = 0

  function limitOf(board) {
    if (board.courseKeyPair) return board.ownLimitBytes ?? DEFAULT_TEACHER_LIMIT_BYTES
    const studentLimit = board.store.moderation?.studentLimitBytes ?? DEFAULT_STUDENT_LIMIT_BYTES
    return Math.min(studentLimit, board.ownLimitBytes ?? Infinity)
  }

  function isOn(board) {
    return board.store.moderation?.on === true
  }

  function sendMessages(peer, messages) {
    for (let start = 0; start < messages.length; start += MESSAGES_PER_FRAME) {
      peer.send.messages.send({ messages: messages.slice(start, start + MESSAGES_PER_FRAME) })
    }
  }

  function sayHello(board, peer) {
    peer.send.hello.send({
      have: isOn(board) ? board.store.newestIds(HELLO_IDS) : [],
      limitBytes: limitOf(board),
      moderationSeq: board.store.moderation?.seq ?? -1,
    })
  }

  // What a peer is missing among this device's newest visible messages, up
  // to what it keeps.
  function catchUp(board, peer, hello) {
    const have = new Set(Array.isArray(hello.have) ? hello.have.slice(0, HELLO_IDS) : [])
    const limitBytes = Number.isSafeInteger(hello.limitBytes) && hello.limitBytes > 0 ? hello.limitBytes : 0
    const missing = []
    let bytes = 0
    for (const { id, message } of board.store.read({ limit: MAX_CATCH_UP_MESSAGES })) {
      if (have.has(id)) continue
      bytes += Buffer.byteLength(JSON.stringify(message)) + 1
      if (bytes > limitBytes) break
      missing.push(message)
    }
    sendMessages(peer, missing)
  }

  function forward(board, from, send) {
    for (const peer of board.peers) if (peer !== from && peer.isOpen) send(peer)
  }

  function receiveMessages(board, from, messages) {
    if (!isOn(board) || !Array.isArray(messages)) return
    const added = []
    for (const message of messages.slice(0, MESSAGES_PER_FRAME)) {
      if (messageProblem(board.key, message, { now: now() })) continue
      const { status } = board.store.add(message)
      if (status === 'added') added.push(message)
    }
    if (added.length === 0) return
    forward(board, from, (peer) => sendMessages(peer, added))
    onChange(board.hex)
  }

  // A newer list than this device's: kept and passed on. Turning the board
  // on starts syncing its messages with everyone connected.
  function receiveModeration(board, from, list) {
    const verified = verifiedModeration(board.key, board.teacherKey, list)
    if (!verified) return false
    const wasOn = isOn(board)
    if (!board.store.setModeration(verified)) return false
    board.store.setLimit(limitOf(board))
    forward(board, from, (peer) => peer.send.moderation.send({ list: verified }))
    if (!wasOn && isOn(board)) {
      for (const peer of board.peers) if (peer.isOpen) sayHello(board, peer)
    }
    onChange(board.hex)
    return true
  }

  function openChannel(board, mux) {
    const peer = { channel: null, isOpen: false, moderationSeq: -1, send: null }
    const channel = mux.createChannel({
      id: board.channelId,
      onclose() {
        peer.isOpen = false
        board.peers.delete(peer)
      },
      onopen() {
        peer.isOpen = true
        sayHello(board, peer)
      },
      protocol: PROTOCOL,
    })
    if (!channel) return // already open on this connection
    const [hello, messages, moderation, older, olderReply] = [
      (value) => {
        if (!value) return
        peer.moderationSeq = Number.isSafeInteger(value.moderationSeq) ? value.moderationSeq : -1
        const ours = board.store.moderation
        if (ours && ours.seq > peer.moderationSeq) peer.send.moderation.send({ list: ours })
        if (isOn(board)) catchUp(board, peer, value)
      },
      (value) => receiveMessages(board, peer, value?.messages),
      (value) => receiveModeration(board, peer, value?.list),
      (value) => {
        if (!isOn(board) || !value || !isBefore(value.before)) return
        const limit = Math.min(MAX_OLDER_PAGE, Number.isSafeInteger(value.limit) ? Math.max(value.limit, 0) : 0)
        peer.send.olderReply.send({
          messages: board.store.read({ before: value.before, limit }).map((entry) => entry.message),
          request: value.request,
        })
      },
      (value) => board.olderReplies.get(value?.request)?.(peer, value?.messages),
    ].map((onmessage) => channel.addMessage({ encoding: json, onmessage }))
    peer.channel = channel
    peer.send = { hello, messages, moderation, older, olderReply }
    board.peers.add(peer)
    channel.open()
  }

  return {
    // A connection: every open board gets a channel on it. Call after
    // Corestore's replicate(), so both share its Protomux.
    attach(stream) {
      const mux = Protomux.from(stream)
      muxes.add(mux)
      // The other side opened a board's channel this side hasn't: open it if
      // this device has that board (else Protomux refuses it).
      mux.pair({ protocol: PROTOCOL }, (id) => {
        const board = boardsByChannel.get(id.toString('hex'))
        if (board) openChannel(board, mux)
      })
      stream.once('close', () => muxes.delete(mux))
      for (const board of boards.values()) openChannel(board, mux)
    },

    // Starts a course's board on this device. `boardKey`: the course's code
    // (its drive key). `teacherKey`: the key that signs the course's drive,
    // the only one whose moderation list counts. `authorKeyPair`: this
    // device's key for the course. `courseKeyPair`: the course's own key pair
    // (teacherKey's), on the teacher's device only: it signs the moderation
    // list and the teacher's messages. `ownLimitBytes`: what this device
    // keeps at most.
    async open(boardKey, { authorKeyPair, courseKeyPair = null, ownLimitBytes = null, teacherKey }) {
      const hex = boardKey.toString('hex')
      const existing = boards.get(hex)
      if (existing) {
        if (courseKeyPair) existing.courseKeyPair = courseKeyPair
        if (ownLimitBytes) existing.ownLimitBytes = ownLimitBytes
        existing.store.setLimit(limitOf(existing))
        return
      }
      if (courseKeyPair && !courseKeyPair.publicKey.equals(teacherKey)) {
        throw new Error("The course key pair doesn't match the board")
      }
      const board = {
        authorKeyPair,
        channelId: channelId(boardKey),
        courseKeyPair,
        hex,
        key: boardKey,
        olderReplies: new Map(),
        ownLimitBytes,
        peers: new Set(),
        store: null,
        teacherKey,
      }
      board.store = await openBoardStore({ boardKey, folder, fs, limitBytes: Infinity, teacherKey })
      board.store.setLimit(limitOf(board))
      boards.set(hex, board)
      boardsByChannel.set(board.channelId.toString('hex'), board)
      for (const mux of muxes) openChannel(board, mux)
    },

    // Stops a board on this device; `remove` deletes what it kept.
    async close(boardKey, { remove = false } = {}) {
      const board = boards.get(boardKey.toString('hex'))
      if (!board) return
      boards.delete(board.hex)
      boardsByChannel.delete(board.channelId.toString('hex'))
      for (const peer of [...board.peers]) peer.channel.close()
      if (remove) await board.store.destroy()
      else await board.store.flush()
    },

    has(boardKey) {
      return boards.has(boardKey.toString('hex'))
    },

    // A page of the board as this device has it.
    read(boardKey, { before = null, limit = 50 } = {}) {
      const board = boards.get(boardKey.toString('hex'))
      if (!board) return null
      return {
        isTeacher: Boolean(board.courseKeyPair),
        // The teacher's key (their messages get the badge), and the key this
        // device posts as, so its own messages can be told apart.
        teacherKey: board.teacherKey.toString('hex'),
        self: (board.courseKeyPair ?? board.authorKeyPair).publicKey.toString('hex'),
        messages: board.store.read({ before, limit }).map(({ id, message }) => ({ ...message, id })),
        moderation: board.store.moderation,
        peers: [...board.peers].filter((peer) => peer.isOpen).length,
      }
    },

    // A message from this device: signed with the teacher's course key on
    // the teacher's device, else with the device's own key for the course.
    post(boardKey, { name = '', text }) {
      const board = boards.get(boardKey.toString('hex'))
      if (!board) throw Object.assign(new Error('This course has no board here'), { code: 'NO_BOARD' })
      if (!isOn(board)) throw Object.assign(new Error('The board is off'), { code: 'BOARD_OFF' })
      const keyPair = board.courseKeyPair ?? board.authorKeyPair
      const message = createMessage({ boardKey: board.key, date: now(), keyPair, name, text })
      const { status } = board.store.add(message)
      if (status !== 'added') throw Object.assign(new Error(`The message wasn't kept: ${status}`), { code: status })
      forward(board, null, (peer) => sendMessages(peer, [message]))
      onChange(board.hex)
      return { ...message, id: messageId(message) }
    },

    // The teacher changes the moderation list: `on`, `studentLimitBytes`,
    // and messages to hide or show (`hide`/`unhide`, ids) and senders to
    // block or unblock (`block`/`unblock`, keys in hex).
    moderate(boardKey, changes) {
      const board = boards.get(boardKey.toString('hex'))
      if (!board?.courseKeyPair) throw Object.assign(new Error('Only the teacher moderates a board'), { code: 'NOT_TEACHER' })
      const current = board.store.moderation
      const hidden = new Set(current?.hidden ?? [])
      const blocked = new Set(current?.blocked ?? [])
      for (const id of changes.hide ?? []) hidden.add(id)
      for (const id of changes.unhide ?? []) hidden.delete(id)
      for (const key of changes.block ?? []) blocked.add(key)
      for (const key of changes.unblock ?? []) blocked.delete(key)
      const list = createModeration({
        boardKey: board.key,
        keyPair: board.courseKeyPair,
        teacherKey: board.teacherKey,
        list: {
          blocked: [...blocked],
          hidden: [...hidden],
          on: changes.on ?? current?.on ?? false,
          // Ordered by time, and always after the list it replaces.
          seq: Math.max(now(), (current?.seq ?? 0) + 1),
          studentLimitBytes: changes.studentLimitBytes ?? current?.studentLimitBytes,
        },
      })
      receiveModeration(board, null, list)
      return list
    },

    // Messages older than `before` from connected devices, for scrolling
    // past the end: checked like any others, not kept.
    async readOlder(boardKey, { before, limit = 50 }) {
      const board = boards.get(boardKey.toString('hex'))
      if (!board || !isOn(board)) return []
      const peers = [...board.peers].filter((peer) => peer.isOpen)
      if (peers.length === 0) return []
      const request = ++olderRequests
      const found = new Map()
      const moderation = board.store.moderation
      const hidden = new Set(moderation?.hidden ?? [])
      const blocked = new Set(moderation?.blocked ?? [])
      await new Promise((resolve) => {
        let waiting = peers.length
        const timer = setTimeout(resolve, OLDER_TIMEOUT_MS)
        board.olderReplies.set(request, (peer, messages) => {
          if (!peers.includes(peer)) return
          for (const message of Array.isArray(messages) ? messages.slice(0, MAX_OLDER_PAGE) : []) {
            if (messageProblem(board.key, message, { now: now() })) continue
            const id = messageId(message)
            if (hidden.has(id) || blocked.has(message.author)) continue
            if (message.date > before.date || (message.date === before.date && id >= before.id)) continue
            found.set(id, { ...message, id })
          }
          waiting -= 1
          if (waiting === 0) {
            clearTimeout(timer)
            resolve()
          }
        })
        for (const peer of peers) peer.send.older.send({ before, limit, request })
      })
      board.olderReplies.delete(request)
      return [...found.values()]
        .sort((a, b) => (a.date !== b.date ? b.date - a.date : a.id < b.id ? 1 : -1))
        .slice(0, limit)
    },

    async closeAll() {
      for (const board of [...boards.values()]) await this.close(board.key)
    },
  }
}

module.exports = { DEFAULT_TEACHER_LIMIT_BYTES, PROTOCOL, createBoards }
