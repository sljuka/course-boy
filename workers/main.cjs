// The real, ongoing Bare worker body (see docs/pear-integration-notes.md) — supersedes
// Phase 0's disposable workers/ping-pong.cjs spike. Talks to electron/bare-worker.ts
// over bare-rpc on the fd-3 pipe (Bare.argv[0] is the Bare binary itself, [1] this
// script's own path — spawn arguments start at [2]).
const Pipe = require('bare-pipe')
const RPC = require('bare-rpc')
const Corestore = require('corestore')
const IdEncoding = require('hypercore-id-encoding')

const CMD_GET_CREATOR_KEY = 1 // must match electron/bare-worker.ts

const storagePath = Bare.argv[2]
const store = new Corestore(storagePath)

const rpc = new RPC(new Pipe(3), async (req) => {
  if (req.command === CMD_GET_CREATOR_KEY) {
    try {
      const keyPair = await store.createKeyPair('creator')
      req.reply(IdEncoding.normalize(keyPair.publicKey))
    } catch (error) {
      console.error('[worker] failed to derive creator key:', error)
      req.reply(`error: ${error.message}`)
    }
  }
})
