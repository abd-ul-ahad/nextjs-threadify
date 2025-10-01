// Global pool configuration and lifecycle management

import { isBrowser, hasWorker } from "../core/env"
import { WorkerPool } from "../core/worker-pool"
import type { PoolStats, ThreadedOptions } from "../core/types"

let __pool: WorkerPool | null = null
let __poolOpts: ThreadedOptions | null = null

/** Configure the global threaded pool. */
export function configureThreaded(opts: ThreadedOptions = {}) {
  __poolOpts = { ...(__poolOpts || {}), ...opts }
  if (__pool && isBrowser) {
    __pool.destroy()
    __pool = null
  }
}

export function getPool(): WorkerPool {
  if (!isBrowser || !hasWorker) {
    return new WorkerPool({
      ...(__poolOpts || {}),
      poolSize: 0,
      strategy: "inline",
      warmup: false,
    })
  }
  if (!__pool) {
    __pool = new WorkerPool(__poolOpts || {})
  }
  return __pool
}

/** Get a diagnostic snapshot of the current global pool. */
export function getThreadedStats(): PoolStats {
  return getPool().getStats()
}

/** Destroy the global pool and release resources. */
export function destroyThreaded() {
  if (__pool) {
    __pool.destroy()
    __pool = null
  }
}
