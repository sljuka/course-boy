// Minimal ambient types for `bare-runtime/spawn`, which ships no `.d.ts` of its own
// (unlike `bare-rpc`, which does and needs no ambient declaration here). Narrow on
// purpose — only the surface `bare-worker.ts` actually calls.

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
