import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';

interface ThreadedProps {
    children: ReactNode;
    /**
     * Optional: Configure worker pool size (defaults to CPU cores - 1)
     */
    poolSize?: number;
    /**
     * Optional: Minimum work time threshold in ms to decide worker vs inline (default: 6ms)
     */
    minWorkTimeMs?: number;
    /**
     * Optional: Enable/disable worker warmup (default: true)
     */
    warmup?: boolean;
    /**
     * Optional: Scheduling strategy - only 'always' supported (default: 'always')
     * All operations will run on worker threads with no fallback to main thread
     */
    strategy?: "always";
    /**
     * Optional: Custom CSS class names to style the container element
     */
    className?: string;
}
/**
 * <Threaded> component wrapper that runs its children in a multi-threaded
 * environment using Web Workers. All operations are guaranteed to run on
 * worker threads with no fallback to main thread execution.
 *
 * Features:
 * - SSR-safe: No errors during server-side rendering
 * - Hydration-friendly: Seamless client-side takeover
 * - Automatic worker pool management
 * - Smooth animations via requestAnimationFrame scheduling
 * - Zero-copy transfers for ArrayBuffers when possible
 * - Worker-only execution: Never falls back to main thread
 *
 * Usage:
 * ```tsx
 * <Threadium poolSize={4}>
 *   <HeavyComponent />
 * </Threadium>
 * ```
 */
declare function Threadium({ children, poolSize, minWorkTimeMs, warmup, strategy, className, }: ThreadedProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access threaded execution within components.
 * Use this to offload heavy computations to worker threads.
 * All operations are guaranteed to run on worker threads with no fallback.
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
 * Wrap a pure function so it runs on the threaded pool.
 */
declare function threaded<T extends (...args: any[]) => any>(fn: T, defaults?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * Decorator form to wrap methods or functions to run on the pool.
 */
declare function Threaded(defaults?: RunOptions): any;

/** Configure the global threaded pool. */
declare function configureThreaded(opts?: ThreadedOptions): void;
/** Get a diagnostic snapshot of the current global pool. */
declare function getThreadedStats(): PoolStats;
/** Destroy the global pool and release resources. */
declare function destroyThreaded(): void;

declare function parallelMap<T, R>(items: T[], mapper: (item: T, idx: number, all: T[]) => R | Promise<R>, options?: RunOptions & {
    chunkSize?: number;
}): Promise<R[]>;

export { type PoolStats, type RunOptions, Threaded, type ThreadedOptions, Threadium, configureThreaded, destroyThreaded, getThreadedStats, parallelMap, threaded, useThreaded };
