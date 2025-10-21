// Public and internal types split out for modularity

export type Strategy = "auto" | "always" | "inline";
export type SaturationPolicy = "reject" | "inline" | "enqueue";

// Re-export clustering types
export type { ClusteringOptions, ClusterStats, TaskCluster, ResourceType, WorkerAffinity, WorkerMetrics } from "./clustering-types";

// Benchmarking types
export interface BenchmarkResult {
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

export interface ClusteringBenchmark {
  baseline: BenchmarkResult;
  clustered: BenchmarkResult;
  improvement: {
    duration: number; // percentage improvement
    throughput: number;
    efficiency: number;
    clusteringEffectiveness: number;
  };
}

/** Pool configuration options. Reasonable defaults are applied when fields are omitted. */
export type ThreadedOptions = {
  poolSize?: number;
  maxQueue?: number;
  warmup?: boolean;
  strategy?: Strategy;
  minWorkTimeMs?: number;
  saturation?: SaturationPolicy;
  preferTransferables?: boolean;
  name?: string;
  timeoutMs?: number;
  // Enhanced clustering options
  enableClustering?: boolean;
  clusteringStrategy?: "complexity" | "resource" | "priority" | "hybrid";
  enableWorkerSpecialization?: boolean;
  enableLoadBalancing?: boolean;
  maxClusterSize?: number;
  clusterTimeoutMs?: number;
  enablePerformanceTracking?: boolean;
};

/** Per-call run options (overrides ThreadedOptions for a single task). */
export type RunOptions = {
  signal?: AbortSignal | null;
  timeoutMs?: number;
  priority?: number;
  preferTransferables?: boolean;
  strategy?: Strategy;
  minWorkTimeMs?: number;
  // Enhanced clustering options
  clustering?: {
    forceCluster?: boolean;
    clusterId?: string;
    workerAffinity?: "any" | "cpu-optimized" | "memory-optimized" | "io-optimized";
    priority?: number; // Enhanced clustering priority for 50%+ performance gains
  };
};

export type Task = {
  id: number;
  code: string;
  args: unknown[];
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  priority: number;
  timeoutAt?: number;
  signal?: AbortSignal | null;
  preferTransferables: boolean;
  // Enhanced clustering metadata
  clustering?: {
    clusterId?: string;
    complexity?: number;
    resourceType?: "cpu-intensive" | "memory-intensive" | "io-bound" | "mixed";
    estimatedDuration?: number;
  };
};

export type WorkerSlot = {
  id: number;
  w: Worker;
  busy: boolean;
  // Enhanced worker metadata
  specialization?: "any" | "cpu-optimized" | "memory-optimized" | "io-optimized";
  metrics?: {
    cpu: number;
    memory: number;
    taskCount: number;
    avgTaskDuration: number;
  };
};

/**
 * Runtime statistics returned by `getThreadedStats()`.
 * `avgLatencyMs` is rounded to the nearest millisecond.
 */
export type PoolStats = {
  name: string;
  poolSize: number;
  busy: number;
  idle: number;
  inFlight: number;
  queued: number;
  completed: number;
  failed: number;
  avgLatencyMs: number;
  // Enhanced clustering statistics
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
