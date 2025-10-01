// Public and internal types split out for modularity

export type Strategy = "auto" | "always" | "inline"
export type SaturationPolicy = "reject" | "inline" | "enqueue"

/** Pool configuration options. Reasonable defaults are applied when fields are omitted. */
export type ThreadedOptions = {
  poolSize?: number
  maxQueue?: number
  warmup?: boolean
  strategy?: Strategy
  minWorkTimeMs?: number
  saturation?: SaturationPolicy
  preferTransferables?: boolean
  name?: string
  timeoutMs?: number
}

/** Per-call run options (overrides ThreadedOptions for a single task). */
export type RunOptions = {
  signal?: AbortSignal | null
  timeoutMs?: number
  priority?: number
  preferTransferables?: boolean
  strategy?: Strategy
  minWorkTimeMs?: number
}

export type Task = {
  id: number
  code: string
  args: any[]
  resolve: (v: any) => void
  reject: (e: any) => void
  priority: number
  timeoutAt?: number
  signal?: AbortSignal | null
  preferTransferables: boolean
}

export type WorkerSlot = {
  id: number
  w: Worker
  busy: boolean
}

/**
 * Runtime statistics returned by `getThreadedStats()`.
 * `avgLatencyMs` is rounded to the nearest millisecond.
 */
export type PoolStats = {
  name: string
  poolSize: number
  busy: number
  idle: number
  inFlight: number
  queued: number
  completed: number
  failed: number
  avgLatencyMs: number
}
