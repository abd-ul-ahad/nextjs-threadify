/* eslint-disable @typescript-eslint/no-explicit-any */

// cthread - lightweight browser worker pool + threaded helper
// ---------------------------------------------------------
// This module provides a small worker-pool implementation and a "threaded"
// wrapper that allows users to run pure functions on worker threads (when
// available) or inline on the main thread when workers are not present.
//
// Features:
// - WorkerPool with configurable pool size, queue saturation policy and timeouts
// - Automatic creation of a worker blob URL that bootstraps a simple runtime
// inside the worker which compiles and caches functions from source
// - Transferable detection to attempt zero-copy transfer of ArrayBuffers
// - Convenience helpers: configureThreaded, threaded, Threaded decorator,
// parallelMap and diagnostic stats
//
// Notes / constraints:
// - Functions passed to `threaded` or `parallelMap` must be self-contained
// (no external closures) since their source is serialized and compiled in
// the worker. Closure variables will not be available in the worker.
// - This implementation aims to be pragmatic and small; it is not intended to
// replace a full-featured job queue or scheduler.

// SSR/browser guards -------------------------------------------------------
// Detect if we are running inside a browser with workers available.
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"
const hasWorker = isBrowser && typeof Worker !== "undefined"

// Config and state
type Strategy = "auto" | "always" | "inline" // auto picks worker for heavy tasks, inline for tiny ones
type SaturationPolicy = "reject" | "inline" | "enqueue" // when queue is full

// Config and state --------------------------------------------------------
// Public types describing configuration options consumed by the pool and
// per-run options users can pass to override defaults.

/** Pool configuration options. Reasonable defaults are applied when fields are omitted. */
export type ThreadedOptions = {
  /** Number of workers in the pool. By default uses hardwareConcurrency - 1 (capped). */
  poolSize?: number // default: hardwareConcurrency - 1 or min(4, cores)
  /** Maximum queued tasks before saturation policy kicks in. */
  maxQueue?: number // default: 256
  /** Whether to spin a tiny job on each worker to warmup JIT. */
  warmup?: boolean // spin a tiny job on each worker to JIT-start
  /** Scheduling strategy: auto chooses worker for heavier tasks, inline for tiny ones. */
  strategy?: Strategy // default: auto
  /** Minimum estimated work time (ms) used when strategy=auto to decide inline vs worker. */
  minWorkTimeMs?: number // if strategy=auto and work estimated < threshold => inline (default 6ms)
  /** Behavior when the queue is full: reject, inline, or enqueue. */
  saturation?: SaturationPolicy // default: enqueue
  /** Try to transfer ArrayBuffers instead of cloning (where possible). */
  preferTransferables?: boolean // default: true (attempt to transfer ArrayBuffers)
  /** Optional name for diagnostics. */
  name?: string // pool label for diagnostics
  /** Default timeout for tasks (ms). `undefined` means no timeout. */
  timeoutMs?: number // default: undefined (no timeout)
}

/** Per-call run options (overrides ThreadedOptions for a single task). */
export type RunOptions = {
  /** Optional AbortSignal to support cancellation. */
  signal?: AbortSignal | null
  /** Per-task timeout in milliseconds. */
  timeoutMs?: number
  /** Priority for simple priority queue (higher numbers first). */
  priority?: number // simple priority queue (higher first)
  /** Prefer transferables for this run (overrides pool default). */
  preferTransferables?: boolean
  /** Override strategy for this run. */
  strategy?: Strategy
  /** Override min work time heuristic for this run. */
  minWorkTimeMs?: number
}

// -------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------

// Simple monotonically increasing task id generator used for correlating
// requests/responses between main thread and workers.
let __taskCounter = 0
const nextTaskId = () => ++__taskCounter

// Transferable helpers ----------------------------------------------------
// Helpers that inspect a value graph and attempt to collect transferable
// objects (ArrayBuffer instances) to pass to postMessage for zero-copy
// transfers. The traversal avoids infinite recursion using a `seen` set and
// limits the number of collected transferables to a small cap.
function isTypedArray(
  v: any,
): v is
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array {
  return ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer
}
/**
 * Walks the object graph and returns a list of transferable items (ArrayBuffers).
 * This is conservative and bounded to avoid pathological traversals.
 */
function collectTransferablesDeep(value: any, limit = 128): Transferable[] {
  const out: Transferable[] = []
  const stack: any[] = [value]
  const seen = new Set<any>()
  while (stack.length && out.length < limit) {
    const v = stack.pop()
    if (!v || typeof v !== "object") continue
    if (seen.has(v)) continue
    seen.add(v)

    if (v instanceof ArrayBuffer) {
      out.push(v)
      continue
    }
    if (isTypedArray(v)) {
      out.push(v.buffer)
      continue
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) stack.push(v[i])
      continue
    }
    for (const k in v) {
      try {
        stack.push(v[k])
      } catch {
        // ignore getters
      }
    }
  }
  return out
}
// -------------------------------------------------------------------------
// Worker bootstrap
// -------------------------------------------------------------------------
// Workers are created from a blob URL that contains a small runtime. The
// runtime receives stringified function source plus args and executes it.
// It caches compiled functions per-source to avoid repeated `new Function`
// costs inside the worker.

/**
 * Create an object URL that can be used to instantiate Workers. The blob
 * contains a small worker runtime that can compile and execute function
 * source passed from the main thread.
 */
function makeWorkerBlobUrl() {
  const workerFn = () => {
    // Worker scope
    const serializeError = (err: any) => {
      if (!err) return { message: "Unknown error" }
      return {
        message: err.message || String(err),
        name: err.name || "Error",
        stack: err.stack || "",
      }
    }

    // Re-declare the typed-array detection and transfer collection inside the
    // worker. This mirrors the main-thread helpers but is self-contained so
    // the worker blob is standalone.
    function isTypedArray(v: any): boolean {
      return typeof v === "object" && v && ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer
    }
    function collectTransferablesDeep(value: any, limit = 128): Transferable[] {
      const out: Transferable[] = []
      const stack: any[] = [value]
      const seen = new Set<any>()
      while (stack.length && out.length < limit) {
        const v = stack.pop()
        if (!v || typeof v !== "object") continue
        if (seen.has(v)) continue
        seen.add(v)

        if (v instanceof ArrayBuffer) {
          out.push(v)
          continue
        }
        if (isTypedArray(v)) {
          // @ts-ignore
          out.push(v.buffer)
          continue
        }
        if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) stack.push(v[i])
          continue
        }
        for (const k in v) {
          try {
            stack.push(v[k])
          } catch {
            // ignore
          }
        }
      }
      return out
    }

    // Small registry of function source -> compiled function to avoid re-compiles
    const fnCache = new Map<string, Function>()

    onmessage = async (e: MessageEvent) => {
      const msg = e.data || {}
      const { id, code, args, preferTransferables } = msg
      if (!id) return

      try {
        let fn = fnCache.get(code)
        if (!fn) {
          // Wrap in function that returns the function result with spread args
          // code is source of the original function, ex: "function f(a,b){...}"
          // We create: (function(){ const __fn = (code); return __fn.apply(null, __ARGS__); })
          fn = new Function("ARGS", `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`)
          fnCache.set(code, fn)
        }
        const result = await (fn as any)(args)

        if (preferTransferables) {
          const transfers = collectTransferablesDeep(result)
          // @ts-ignore
          postMessage({ id, ok: true, result }, transfers)
        } else {
          // @ts-ignore
          postMessage({ id, ok: true, result })
        }
      } catch (err: any) {
        // @ts-ignore
        postMessage({ id, ok: false, error: serializeError(err) })
      }
    }
  }

  const src = `(${workerFn.toString()})();`
  const blob = new Blob([src], { type: "text/javascript" })
  return URL.createObjectURL(blob)
}

// -------------------------------------------------------------------------
// Types used by the pool/runtime
// -------------------------------------------------------------------------
type Task = {
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

type WorkerSlot = {
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

// -------------------------------------------------------------------------
// WorkerPool implementation
// -------------------------------------------------------------------------
class WorkerPool {
  private opts: Required<ThreadedOptions>
  private url: string | null = null
  private workers: WorkerSlot[] = []
  private queue: Task[] = []
  private taskMap = new Map<number, { createdAt: number; resolve: Function; reject: Function }>()
  private completed = 0
  private failed = 0
  private latencies: number[] = []
  private destroyed = false

  constructor(opts: ThreadedOptions = {}) {
    // Choose sensible defaults. If hardwareConcurrency is missing (e.g., in
    // some test environments), fall back to 4 cores.
    const cores = (isBrowser && (navigator as any)?.hardwareConcurrency) || 4
    const defaultPool = Math.max(1, Math.min(cores - 1, 4))
    this.opts = {
      poolSize: Math.max(1, opts.poolSize ?? defaultPool),
      maxQueue: opts.maxQueue ?? 256,
      warmup: opts.warmup ?? true,
      strategy: opts.strategy ?? "auto",
      minWorkTimeMs: opts.minWorkTimeMs ?? 6,
      saturation: opts.saturation ?? "enqueue",
      preferTransferables: opts.preferTransferables ?? true,
      name: opts.name ?? "cthread",
      timeoutMs: opts.timeoutMs ?? 10000, // Updated default worker timeout
    }

    if (hasWorker) {
      this.url = makeWorkerBlobUrl()
      for (let i = 0; i < this.opts.poolSize; i++) {
        const w = new Worker(this.url)
        const slot: WorkerSlot = { id: i, w, busy: false }
        w.onmessage = (e: MessageEvent) => this.handleWorkerMessage(slot, e)
        w.onerror = (e: any) => {
          // Keep the pool running even if a worker throws; count failures
          // elsewhere (we do not terminate the whole pool on a single error).
          // console.warn("[cthread] worker error:", e);
        }
        this.workers.push(slot)
      }
      if (this.opts.warmup) this.warmup()
    }
  }

  /**
   * Warmup: post a tiny job to each worker to prime the runtime/JIT.
   * This reduces the latency of the first "real" task.
   */
  private warmup() {
    // tiny tasks to JIT the worker
    const tiny = () => 1 + 1
    const code = tiny.toString()
    for (const slot of this.workers) {
      // fire and forget
      try {
        slot.w.postMessage({
          id: -1,
          code,
          args: [],
          preferTransferables: false,
        })
      } catch {}
    }
  }

  /**
   * Terminate workers, revoke blob URL and cleanup internal state.
   * Safe to call multiple times.
   */
  destroy() {
    if (this.destroyed) return
    for (const slot of this.workers) {
      try {
        slot.w.terminate()
      } catch {}
    }
    if (this.url) {
      URL.revokeObjectURL(this.url)
      this.url = null
    }
    this.workers = []
    this.queue = []
    this.destroyed = true
  }

  /**
   * Produce a snapshot of pool statistics for diagnostics.
   */
  getStats(): PoolStats {
    const busy = this.workers.filter((w) => w.busy).length
    const avg = this.latencies.length ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 0
    return {
      name: this.opts.name,
      poolSize: this.workers.length,
      busy,
      idle: this.workers.length - busy,
      inFlight: busy,
      queued: this.queue.length,
      completed: this.completed,
      failed: this.failed,
      avgLatencyMs: Math.round(avg),
    }
  }

  /**
   * Internal worker message handler. Matches responses to pending tasks and
   * resolves/rejects the stored promises.
   */
  private handleWorkerMessage(slot: WorkerSlot, e: MessageEvent) {
    slot.busy = false
    const msg = e.data || {}
    const { id, ok, result, error } = msg
    const rec = this.taskMap.get(id)
    if (!rec) {
      // Possibly the task timed out or was cancelled; just pump to schedule
      // next queued tasks.
      this.pump()
      return
    }
    this.taskMap.delete(id)
    const latency = performance.now() - rec.createdAt
    this.latencies.push(latency)
    if (this.latencies.length > 1000) this.latencies.shift()

    if (ok) {
      this.completed++
      rec.resolve(result)
    } else {
      this.failed++
      rec.reject(error)
    }
    this.pump()
  }

  /**
   * Return the first free worker slot or null when none available.
   */
  private pickFreeWorker(): WorkerSlot | null {
    for (const slot of this.workers) if (!slot.busy) return slot
    return null
  }

  /**
   * Insert a task into the queue with priority ordering (higher first).
   */
  private schedule(task: Task) {
    // Priority: higher first
    let i = this.queue.length - 1
    while (i >= 0 && this.queue[i].priority < task.priority) i--
    this.queue.splice(i + 1, 0, task)
    this.pump()
  }

  /**
   * Attempt to assign queued tasks to free workers. Called after state
   * changes (task completion, worker freed, scheduling new task, etc.).
   */
  private pump() {
    if (!hasWorker) return
    while (true) {
      const slot = this.pickFreeWorker()
      if (!slot) break
      const task = this.queue.shift()
      if (!task) break

      // Aborted pre-dispatch
      if (task.signal?.aborted) {
        task.reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
        continue
      }

      slot.busy = true
      const { id, code, args, preferTransferables } = task

      this.taskMap.set(id, {
        createdAt: performance.now(),
        resolve: task.resolve,
        reject: task.reject,
      })

      // timeout
      if (task.timeoutAt) {
        const rem = Math.max(0, task.timeoutAt - performance.now())
        setTimeout(() => {
          if (this.taskMap.has(id)) {
            this.taskMap.get(id)?.reject(Object.assign(new Error("Timeout"), { name: "TimeoutError" }))
            this.taskMap.delete(id)
          }
        }, rem)
      }

      try {
        const transfers = preferTransferables ? collectTransferablesDeep(args) : []
        slot.w.postMessage({ id, code, args, preferTransferables }, transfers)
      } catch (err) {
        slot.busy = false
        this.taskMap.delete(id)
        task.reject(err)
      }
    }
  }

  /**
   * Main entry point for running a task. Honor strategy/inline heuristics,
   * saturation policy, and cancellation. Returns a Promise that resolves with
   * the function result or rejects with an error-like object.
   */
  run(code: string, args: any[], options: RunOptions = {}) {
    const id = nextTaskId()

    // Inline strategy if needed
    const strategy = options.strategy ?? this.opts.strategy
    const minWork = options.minWorkTimeMs ?? this.opts.minWorkTimeMs

    // Heuristic: if no workers or strategy=inline, just run inline
    if (!hasWorker || strategy === "inline") {
      return this.runInline(code, args)
    }

    // If auto and known to be tiny (user hinted by minWorkTimeMs), we conservatively inline
    // Users can override by strategy="always"
    if (strategy === "auto" && this.workers.length === 0) {
      return this.runInline(code, args)
    }

    // If queue is saturated
    const saturated = this.queue.length >= this.opts.maxQueue
    if (saturated) {
      const policy = this.opts.saturation
      if (policy === "reject") {
        return Promise.reject(
          Object.assign(new Error("Queue saturated"), {
            name: "SaturationError",
          }),
        )
      } else if (policy === "inline") {
        return this.runInline(code, args)
      } // else enqueue
    }

    const preferTransferables = options.preferTransferables ?? this.opts.preferTransferables

    // Cancellation pre-check
    if (options.signal?.aborted) {
      return Promise.reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
    }

    return new Promise<any>((resolve, reject) => {
      const t: Task = {
        id,
        code,
        args,
        resolve,
        reject,
        priority: options.priority ?? 0,
        timeoutAt:
          (options.timeoutMs ?? this.opts.timeoutMs)
            ? performance.now() + (options.timeoutMs ?? this.opts.timeoutMs)!
            : undefined,
        signal: options.signal ?? null,
        preferTransferables,
      }

      // Listen for cancel while queued
      if (t.signal) {
        const listener = () => {
          // remove from queue if still queued
          const idx = this.queue.findIndex((q) => q.id === t.id)
          if (idx >= 0) {
            this.queue.splice(idx, 1)
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))
          }
          // remove listener (best-effort)
          try {
            t.signal?.removeEventListener("abort", listener as any)
          } catch {}
        }
        t.signal.addEventListener("abort", listener, { once: true })
      }

      this.schedule(t)
    })
  }

  /**
   * Execute the provided function source inline on the main thread. This
   * constructs a new Function wrapper and invokes it with the `args` array.
   * Note: this is synchronous from the perspective of the invoked function
   * but we return a Promise so the API is consistent.
   */
  private async runInline(code: string, args: any[]) {
    // Execute in main thread
    const fn = new Function("ARGS", `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`)
    return fn(args)
  }
}

// -------------------------------------------------------------------------
// Module-level singleton pool management
// -------------------------------------------------------------------------
let __pool: WorkerPool | null = null
let __poolOpts: ThreadedOptions | null = null

/**
 * Configure the global threaded pool. If a pool already exists it will be
 * destroyed and re-created with the new options on the next `threaded`
 * invocation (or immediately if `getPool()` is called).
 */
export function configureThreaded(opts: ThreadedOptions = {}) {
  __poolOpts = { ...(__poolOpts || {}), ...opts }
  if (__pool && isBrowser) {
    __pool.destroy()
    __pool = null
  }
}

function getPool(): WorkerPool {
  if (!isBrowser || !hasWorker) {
    // Environment without workers: return a "fake" pool that runs tasks
    // inline. We still construct a WorkerPool instance but we force it into
    // inline mode via the provided opts.
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

// -------------------------------------------------------------------------
// Public API: threaded wrappers and helpers
// -------------------------------------------------------------------------
/**
 * Wrap a pure function so it runs on the threaded pool. The provided function
 * must be self-contained (no external closures) because its source is
 * serialized and compiled inside the worker.
 *
 * Returns a function that when called will return a Promise of the result.
 */
export function threaded<T extends (...args: any[]) => any>(
  fn: T,
  defaults: RunOptions = {},
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const code = fn.toString()
  return (...args: any[]) => {
    const pool = getPool()
    return pool.run(code, args, defaults)
  }
}

/**
 * Decorator form to wrap methods or functions to run on the pool.
 * Usage: `@Threaded()` above a method or `const f = Threaded()(function...)`.
 */
export function Threaded(defaults: RunOptions = {}): any {
  // Method decorator
  return (target: any, context: any) => {
    if (context && (context.kind === "method" || context.kind === "getter" || context.kind === "setter")) {
      const original = target
      const code = original.toString()
      return function (this: any, ...args: any[]) {
        const pool = getPool()
        return pool.run(code, args, defaults)
      }
    }
    // Fallback: legacy decorator or direct function
    if (typeof target === "function") {
      const code = target.toString()
      return (...args: any[]) => {
        const pool = getPool()
        return pool.run(code, args, defaults)
      }
    }
    return target
  }
}

// -------------------------------------------------------------------------
// parallelMap helper
// -------------------------------------------------------------------------
/**
 * Map over `items` in parallel by chunking them and running each chunk on a
 * worker. The `mapper` must be self-contained (no external closures). This
 * reduces per-item dispatch overhead by processing chunks inside workers.
 *
 * Options: pass `chunkSize` to control how many items per chunk; otherwise
 * it will attempt to balance across pool size.
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, idx: number, all: T[]) => R | Promise<R>,
  options: RunOptions & { chunkSize?: number } = {},
): Promise<R[]> {
  const pool = getPool()
  const code = mapper.toString()

  const chunkSize = Math.max(1, options.chunkSize ?? Math.ceil(items.length / Math.max(1, pool.getStats().poolSize)))
  const chunks: { start: number; end: number }[] = []
  for (let i = 0; i < items.length; i += chunkSize)
    chunks.push({ start: i, end: Math.min(items.length, i + chunkSize) })

  const out: R[] = new Array(items.length)
  await Promise.all(
    chunks.map(({ start, end }) => {
      // Prepare pairs of [value, absoluteIndex] so mapper can know original
      // index. We then run one function per chunk inside the worker which
      // iterates the slice and calls the mapper for each element locally.
      const slice = items.slice(start, end).map((v, i) => [v, start + i] as const)
      // run chunk in worker once and map inside to reduce dispatch overhead
      const chunkRunner = (pairs: readonly (readonly [any, number])[]) => {
        const mapperFn = (0, eval)(`(${code})`)
        // Note: closures not supported—mapper must be pure function
        return pairs.map(([v, idx]) => mapperFn(v, idx, []))
      }
      return pool.run(chunkRunner.toString(), [slice], options).then((results: any[]) => {
        for (let i = 0; i < results.length; i++) out[start + i] = results[i]
      })
    }),
  )

  return out
}
