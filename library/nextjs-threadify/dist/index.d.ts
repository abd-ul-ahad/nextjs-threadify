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

interface TaskCluster {
    id: string;
    tasks: any[];
    priority: number;
    estimatedDuration: number;
    resourceType: ResourceType;
    affinity: WorkerAffinity;
}
type ResourceType = "cpu-intensive" | "memory-intensive" | "io-bound" | "mixed";
type WorkerAffinity = "any" | "cpu-optimized" | "memory-optimized" | "io-optimized";
interface WorkerMetrics {
    workerId: number;
    cpuUtilization: number;
    memoryUsage: number;
    taskCount: number;
    avgTaskDuration: number;
    specialization: WorkerAffinity;
    lastActivity: number;
}
interface ClusteringOptions {
    enableTaskClustering: boolean;
    enableWorkerSpecialization: boolean;
    enableLoadBalancing: boolean;
    clusteringStrategy: "complexity" | "resource" | "priority" | "hybrid";
    maxClusterSize: number;
    clusterTimeoutMs: number;
    enablePerformanceTracking: boolean;
    priority?: number;
}
interface ClusterStats {
    totalClusters: number;
    activeClusters: number;
    avgClusterSize: number;
    clusteringEfficiency: number;
    loadBalanceScore: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
    };
}

type Strategy = "auto" | "always" | "inline";
type SaturationPolicy = "reject" | "inline" | "enqueue";

interface BenchmarkResult$1 {
    name: string;
    duration: number;
    throughput: number;
    efficiency: number;
    clusteringEffectiveness: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
    };
    loadBalanceScore: number;
}
interface ClusteringBenchmark$1 {
    baseline: BenchmarkResult$1;
    clustered: BenchmarkResult$1;
    improvement: {
        duration: number;
        throughput: number;
        efficiency: number;
        clusteringEffectiveness: number;
    };
}
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
    enableClustering?: boolean;
    clusteringStrategy?: "complexity" | "resource" | "priority" | "hybrid";
    enableWorkerSpecialization?: boolean;
    enableLoadBalancing?: boolean;
    maxClusterSize?: number;
    clusterTimeoutMs?: number;
    enablePerformanceTracking?: boolean;
};
/** Per-call run options (overrides ThreadedOptions for a single task). */
type RunOptions = {
    signal?: AbortSignal | null;
    timeoutMs?: number;
    priority?: number;
    preferTransferables?: boolean;
    strategy?: Strategy;
    minWorkTimeMs?: number;
    clustering?: {
        forceCluster?: boolean;
        clusterId?: string;
        workerAffinity?: "any" | "cpu-optimized" | "memory-optimized" | "io-optimized";
        priority?: number;
    };
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
    clustering?: {
        totalClusters: number;
        activeClusters: number;
        avgClusterSize: number;
        clusteringEfficiency: number;
        loadBalanceScore: number;
        resourceUtilization: {
            cpu: number;
            memory: number;
        };
    };
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
/** Get detailed clustering statistics. */
declare function getClusterStats(): ClusterStats;
/** Configure clustering options dynamically. */
declare function configureClustering(options: Partial<ClusteringOptions>): void;
/** Get worker specialization information. */
declare function getWorkerSpecializations(): Map<number, string>;
/** Manually assign worker specialization. */
declare function setWorkerSpecialization(workerId: number, specialization: string): void;
/** Destroy the global pool and release resources. */
declare function destroyThreaded(): void;

declare function parallelMap<T, R>(items: T[], mapper: (item: T, idx: number, all: T[]) => R | Promise<R>, options?: RunOptions & {
    chunkSize?: number;
}): Promise<R[]>;

/**
 * Enhanced threaded function with clustering support
 */
declare function clusteredThreaded<T extends (...args: any[]) => any>(fn: T, defaults?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * CPU-intensive task wrapper with specialized clustering
 */
declare function cpuIntensive<T extends (...args: any[]) => any>(fn: T, options?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * Memory-intensive task wrapper with specialized clustering
 */
declare function memoryIntensive<T extends (...args: any[]) => any>(fn: T, options?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * I/O-bound task wrapper with specialized clustering
 */
declare function ioBound<T extends (...args: any[]) => any>(fn: T, options?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * High-priority task wrapper with priority clustering
 */
declare function highPriority<T extends (...args: any[]) => any>(fn: T, options?: RunOptions): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
/**
 * Batch processing with intelligent clustering
 */
declare function clusteredBatch<T, R>(items: T[], processor: (item: T, index: number) => R | Promise<R>, options?: RunOptions & {
    batchSize?: number;
    clusterStrategy?: "similarity" | "size" | "priority";
}): Promise<R[]>;
/**
 * Smart parallel processing with clustering optimization
 */
declare function smartParallelMap<T, R>(items: T[], mapper: (item: T, index: number, all: T[]) => R | Promise<R>, options?: RunOptions & {
    clusteringStrategy?: "complexity" | "resource" | "priority" | "hybrid";
    adaptiveBatching?: boolean;
}): Promise<R[]>;
/**
 * Performance-optimized clustering for similar tasks
 */
declare function performanceCluster<T extends (...args: any[]) => any>(tasks: Array<{
    fn: T;
    args: Parameters<T>;
    priority?: number;
}>, options?: RunOptions): Promise<Array<Awaited<ReturnType<T>>>>;

interface BenchmarkResult {
    name: string;
    duration: number;
    throughput: number;
    efficiency: number;
    clusteringEffectiveness: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
    };
    loadBalanceScore: number;
}
interface ClusteringBenchmark {
    baseline: BenchmarkResult;
    clustered: BenchmarkResult;
    improvement: {
        duration: number;
        throughput: number;
        efficiency: number;
        clusteringEffectiveness: number;
    };
}
interface BenchmarkSuite {
    name: string;
    tests: Array<{
        name: string;
        fn: () => Promise<any>;
        iterations: number;
        dataSize: number;
    }>;
}
/**
 * Benchmark clustering effectiveness against baseline performance
 */
declare function benchmarkClustering(testFunction: () => Promise<any>, iterations?: number, _dataSize?: number): Promise<ClusteringBenchmark>;
/**
 * Run comprehensive benchmark suite
 */
declare function runBenchmarkSuite(suite: BenchmarkSuite): Promise<ClusteringBenchmark[]>;
/**
 * Monitor real-time clustering performance
 */
declare function startPerformanceMonitoring(intervalMs?: number, callback?: (stats: PoolStats & {
    clustering?: any;
}) => void): () => void;
/**
 * Generate performance report
 */
declare function generatePerformanceReport(benchmarks: ClusteringBenchmark[]): string;
/**
 * Create synthetic workload for testing
 */
declare function createSyntheticWorkload(type: "cpu" | "memory" | "io" | "mixed", complexity: "low" | "medium" | "high", dataSize: number): () => Promise<any>;
/**
 * Predefined benchmark suites
 */
declare const BenchmarkSuites: {
    cpuIntensive: {
        name: string;
        tests: {
            name: string;
            fn: () => Promise<any>;
            iterations: number;
            dataSize: number;
        }[];
    };
    memoryIntensive: {
        name: string;
        tests: {
            name: string;
            fn: () => Promise<any>;
            iterations: number;
            dataSize: number;
        }[];
    };
    mixed: {
        name: string;
        tests: {
            name: string;
            fn: () => Promise<any>;
            iterations: number;
            dataSize: number;
        }[];
    };
};

export { type BenchmarkResult$1 as BenchmarkResult, BenchmarkSuites, type ClusterStats, type ClusteringBenchmark$1 as ClusteringBenchmark, type ClusteringOptions, type PoolStats, type ResourceType, type RunOptions, type TaskCluster, Threaded, type ThreadedOptions, Threadium, type WorkerAffinity, type WorkerMetrics, benchmarkClustering, clusteredBatch, clusteredThreaded, configureClustering, configureThreaded, cpuIntensive, createSyntheticWorkload, destroyThreaded, generatePerformanceReport, getClusterStats, getThreadedStats, getWorkerSpecializations, highPriority, ioBound, memoryIntensive, parallelMap, performanceCluster, runBenchmarkSuite, setWorkerSpecialization, smartParallelMap, startPerformanceMonitoring, threaded, useThreaded };
