// Minimal ambient types for the two untyped CJS packages `bare-worker.ts` uses.
// Narrow on purpose — only the surface Phase 0 actually calls, not a full typing
// of either library.

declare module 'bare-runtime/spawn' {
  import type { ChildProcess, SpawnOptions } from 'node:child_process'

  type BareSpawnOptions = SpawnOptions & {
    args?: string[]
    suppressSignals?: boolean
    forwardExitCode?: boolean
  }

  function spawnBare(referrer: string, options?: BareSpawnOptions): ChildProcess

  export = spawnBare
}

declare module 'framed-stream' {
  import type { Duplex } from 'node:stream'

  class FramedStream extends Duplex {
    constructor(rawStream: NodeJS.ReadWriteStream, options?: { bits?: 8 | 16 | 24 | 32 })
  }

  export = FramedStream
}
