// Main library exports - consolidated API
export { Threadium, useThreaded } from "./src/react/Threadium";

export { threaded, Threaded } from "./src/api/threaded";
export {
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
  getClusterStats,
  configureClustering,
  getWorkerSpecializations,
  setWorkerSpecialization,
} from "./src/api/pool";
export { parallelMap } from "./src/api/parallel";

// Enhanced clustering APIs
export {
  clusteredThreaded,
  cpuIntensive,
  memoryIntensive,
  ioBound,
  highPriority,
  clusteredBatch,
  smartParallelMap,
  performanceCluster,
} from "./src/api/clustering";

// Performance benchmarking
export {
  benchmarkClustering,
  runBenchmarkSuite,
  startPerformanceMonitoring,
  generatePerformanceReport,
  createSyntheticWorkload,
  BenchmarkSuites,
} from "./src/api/benchmarking";

export type { 
  PoolStats, 
  RunOptions, 
  ThreadedOptions,
  ClusteringOptions,
  ClusterStats,
  BenchmarkResult,
  ClusteringBenchmark,
} from "./src/core/types";
export type { 
  TaskCluster,
  ResourceType,
  WorkerAffinity,
  WorkerMetrics,
} from "./src/core/clustering-types";
