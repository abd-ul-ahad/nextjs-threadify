type Strategy = "auto" | "always" | "inline";
type SaturationPolicy = "reject" | "inline" | "enqueue";
/** Pool configuration options. Reasonable defaults are applied when fields are omitted. */
type ThreadedOptions = {
    /** Number of workers in the pool. By default uses hardwareConcurrency - 1 (capped). */
    poolSize?: number;
    /** Maximum queued tasks before saturation policy kicks in. */
    maxQueue?: number;
    /** Whether to spin a tiny job on each worker to warmup JIT. */
    warmup?: boolean;
    /** Scheduling strategy: auto chooses worker for heavier tasks, inline for tiny ones. */
    strategy?: Strategy;
    /** Minimum estimated work time (ms) used when strategy=auto to decide inline vs worker. */
    minWorkTimeMs?: number;
    /** Behavior when the queue is full: reject, inline, or enqueue. */
    saturation?: SaturationPolicy;
    /** Try to transfer ArrayBuffers instead of cloning (where possible). */
    preferTransferables?: boolean;
    /** Optional name for diagnostics. */
    name?: string;
    /** Default timeout for tasks (ms). `undefined` means no timeout. */
    timeoutMs?: number;
};
/** Per-call run options (overrides ThreadedOptions for a single task). */
type RunOptions = {
    /** Optional AbortSignal to support cancellation. */
    signal?: AbortSignal | null;
    /** Per-task timeout in milliseconds. */
    timeoutMs?: number;
    /** Priority for simple priority queue (higher numbers first). */
    priority?: number;
    /** Prefer transferables for this run (overrides pool default). */
    preferTransferables?: boolean;
    /** Override strategy for this run. */
    strategy?: Strategy;
    /** Override min work time heuristic for this run. */
    minWorkTimeMs?: number;
};
/**
 * Runtime statistics returned by `getThreadedStats()`.
 * `avgLatencyMs` is rounded to the nearest millisecond.
 */
type PoolStats = {
    name: string;
    poolSize: number;
    busy: number;
    idle: number;
    inFlight: number;
    queued: number;
    completed: number;
    failed: number;
    avgLatencyMs: number;
};
/**
 * Configure the global threaded pool. If a pool already exists it will be
 * destroyed and re-created with the new options on the next `threaded`
 * invocation (or immediately if `getPool()` is called).
 */
declare function configureThreaded(opts?: ThreadedOptions): void;
/** Get a diagnostic snapshot of the current global pool. */
declare function getThreadedStats(): PoolStats;
/** Destroy the global pool and release resources. */
declare function destroyThreaded(): void;
/**
 * Wrap a pure function so it runs on the threaded pool. The provided function
 * must be self-contained (no external closures) because its source is
 * serialized and compiled inside the worker.
 *
 * Returns a function that when called will return a Promise of the result.
 */
declare function threaded<T extends (...args: any[]) => any>(fn: T, defaults?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * Decorator form to wrap methods or functions to run on the pool.
 * Usage: `@Threaded()` above a method or `const f = Threaded()(function...)`.
 */
declare function Threaded(defaults?: RunOptions): any;
/**
 * Map over `items` in parallel by chunking them and running each chunk on a
 * worker. The `mapper` must be self-contained (no external closures). This
 * reduces per-item dispatch overhead by processing chunks inside workers.
 *
 * Options: pass `chunkSize` to control how many items per chunk; otherwise
 * it will attempt to balance across pool size.
 */
declare function parallelMap<T, R>(items: T[], mapper: (item: T, idx: number, all: T[]) => R | Promise<R>, options?: RunOptions & {
    chunkSize?: number;
}): Promise<R[]>;

export { type PoolStats, type RunOptions, Threaded, type ThreadedOptions, configureThreaded, destroyThreaded, getThreadedStats, parallelMap, threaded };
