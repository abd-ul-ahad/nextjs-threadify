/**
 * Ultra-fast threaded execution hook with minimal overhead.
 * Optimized for maximum performance with intelligent caching and lazy initialization.
 *
 * Example:
 * ```tsx
 * const processData = useThreaded((data: number[]) => {
 *   return data.map(x => x * 2).reduce((a, b) => a + b, 0)
 * })
 *
 * const result = await processData([1, 2, 3, 4, 5])
 * ```
 */
declare function useThreaded<T extends (...args: any[]) => any>(fn: T, deps?: any[]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

type Strategy = "auto" | "always" | "inline";
type SaturationPolicy = "reject" | "inline" | "enqueue";
/** Pool configuration options. Reasonable defaults are applied when fields are omitted. */
type ThreadedOptions = {
    poolSize?: number;
    maxQueue?: number;
    warmup?: boolean;
    strategy?: Strategy;
    minWorkTimeMs?: number;
    saturation?: SaturationPolicy;
    preferTransferables?: boolean;
    name?: string;
    timeoutMs?: number;
};
/** Per-call run options (overrides ThreadedOptions for a single task). */
type RunOptions = {
    signal?: AbortSignal | null;
    timeoutMs?: number;
    priority?: number;
    preferTransferables?: boolean;
    strategy?: Strategy;
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
 * Ultra-fast threaded function wrapper with intelligent caching.
 * Optimized for maximum performance with minimal overhead.
 */
declare function threaded<T extends (...args: unknown[]) => unknown>(fn: T, defaults?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * Decorator form to wrap methods or functions to run on the pool.
 */
declare function Threaded(defaults?: RunOptions): unknown;

/** Configure the global threaded pool. */
declare function configureThreaded(opts?: ThreadedOptions): void;
/** Get a diagnostic snapshot of the current global pool. */
declare function getThreadedStats(): PoolStats;
/** Destroy the global pool and release resources. */
declare function destroyThreaded(): void;

declare function parallelMap<T, R>(items: T[], mapper: (item: T, idx: number, all: T[]) => R | Promise<R>, options?: RunOptions & {
    chunkSize?: number;
}): Promise<R[]>;

export { type PoolStats, type RunOptions, Threaded, type ThreadedOptions, configureThreaded, destroyThreaded, getThreadedStats, parallelMap, threaded, useThreaded };
