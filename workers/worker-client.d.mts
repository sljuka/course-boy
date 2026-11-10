// Types for worker-client.mjs (the host's side of the Bare worker).

export type WorkerClient = {
  // Kills the worker without waiting (a host that is quitting).
  kill(): void
  // Sends a command; resolves to its JSON reply, throwing on `error` (with its
  // `code`, and `fromWorker: true`).
  request<T = Record<string, unknown>>(command: number, payload?: unknown): Promise<T>
  // Sends a command; resolves to the raw reply as text.
  requestRaw(command: number, payload?: unknown): Promise<string>
  // Stops the worker; resolves once it has exited.
  stop(options?: { timeoutMs?: number }): Promise<void>
}

export function startWorker(options: {
  // After the worker's path: its storage folder, then the optional test-only
  // DHT bootstrap and download limits.
  args?: string[]
  onError?: (error: Error) => void
  // An event the worker sent (`events` in protocol.json), with its JSON text.
  onEvent?: (command: number, data: string) => void
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void
  onStderr?: (text: string) => void
  onStdout?: (text: string) => void
  workerPath: string
}): WorkerClient
