// Performance benchmarking and clustering effectiveness metrics

import { getPool, getClusterStats } from "./pool";
import type { PoolStats } from "../core/types";

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

export interface BenchmarkSuite {
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
export async function benchmarkClustering(
  testFunction: () => Promise<any>,
  iterations: number = 100,
  _dataSize: number = 1000
): Promise<ClusteringBenchmark> {
  const pool = getPool();
  
  // Disable clustering for baseline
  pool.configureClustering({
    enableTaskClustering: false,
    enableWorkerSpecialization: false,
    enableLoadBalancing: false,
  });
  
  const baseline = await runBenchmark("Baseline", testFunction, iterations, 1000);
  
  // Enable clustering for comparison
  pool.configureClustering({
    enableTaskClustering: true,
    enableWorkerSpecialization: true,
    enableLoadBalancing: true,
    clusteringStrategy: "hybrid",
  });
  
  const clustered = await runBenchmark("Clustered", testFunction, iterations, 1000);
  
  return {
    baseline,
    clustered,
    improvement: {
      duration: ((baseline.duration - clustered.duration) / baseline.duration) * 100,
      throughput: ((clustered.throughput - baseline.throughput) / baseline.throughput) * 100,
      efficiency: ((clustered.efficiency - baseline.efficiency) / baseline.efficiency) * 100,
      clusteringEffectiveness: clustered.clusteringEffectiveness,
    },
  };
}

/**
 * Run comprehensive benchmark suite
 */
export async function runBenchmarkSuite(suite: BenchmarkSuite): Promise<ClusteringBenchmark[]> {
  const results: ClusteringBenchmark[] = [];
  
  for (const test of suite.tests) {
    console.log(`Running benchmark: ${test.name}`);
    const result = await benchmarkClustering(test.fn, test.iterations, test.dataSize);
    results.push(result);
  }
  
  return results;
}

/**
 * Monitor real-time clustering performance
 */
export function startPerformanceMonitoring(
  intervalMs: number = 1000,
  callback?: (stats: PoolStats & { clustering?: any }) => void
): () => void {
  const interval = setInterval(() => {
    const stats = getPool().getStats();
    const clusterStats = getClusterStats();
    
    const enhancedStats = {
      ...stats,
      clustering: clusterStats,
    };
    
    if (callback) {
      callback(enhancedStats);
    } else {
      console.log("Performance Stats:", {
        pool: {
          busy: stats.busy,
          idle: stats.idle,
          queued: stats.queued,
          avgLatency: stats.avgLatencyMs,
        },
        clustering: {
          totalClusters: clusterStats.totalClusters,
          activeClusters: clusterStats.activeClusters,
          efficiency: clusterStats.clusteringEfficiency,
          loadBalance: clusterStats.loadBalanceScore,
        },
      });
    }
  }, intervalMs);
  
  return () => clearInterval(interval);
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  benchmarks: ClusteringBenchmark[]
): string {
  const report = {
    summary: {
      totalTests: benchmarks.length,
      avgImprovement: {
        duration: benchmarks.reduce((sum, b) => sum + b.improvement.duration, 0) / benchmarks.length,
        throughput: benchmarks.reduce((sum, b) => sum + b.improvement.throughput, 0) / benchmarks.length,
        efficiency: benchmarks.reduce((sum, b) => sum + b.improvement.efficiency, 0) / benchmarks.length,
      },
    },
    tests: benchmarks.map(b => ({
      name: b.baseline.name,
      improvement: b.improvement,
      clusteringEffectiveness: b.clustered.clusteringEffectiveness,
    })),
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Create synthetic workload for testing
 */
export function createSyntheticWorkload(
  type: "cpu" | "memory" | "io" | "mixed",
  complexity: "low" | "medium" | "high",
  dataSize: number
): () => Promise<any> {
  switch (type) {
    case "cpu":
      return createCPUWorkload(complexity, dataSize);
    case "memory":
      return createMemoryWorkload(complexity, dataSize);
    case "io":
      return createIOWorkload(complexity, dataSize);
    case "mixed":
      return createMixedWorkload(complexity, dataSize);
  }
}

// Helper functions

async function runBenchmark(
  name: string,
  testFunction: () => Promise<any>,
  iterations: number,
  _dataSize: number
): Promise<BenchmarkResult> {
  const startTime = performance.now();
  
  // Run iterations
  const promises = Array.from({ length: iterations }, () => testFunction());
  await Promise.all(promises);
  
  const endTime = performance.now();
  const endStats = getPool().getStats();
  const clusterStats = getClusterStats();
  
  const duration = endTime - startTime;
  const throughput = iterations / (duration / 1000); // operations per second
  const efficiency = (endStats.completed / iterations) * 100;
  
  return {
    name,
    duration,
    throughput,
    efficiency,
    clusteringEffectiveness: clusterStats.clusteringEfficiency,
    resourceUtilization: clusterStats.resourceUtilization,
    loadBalanceScore: clusterStats.loadBalanceScore,
  };
}

function createCPUWorkload(complexity: string, dataSize: number): () => Promise<number> {
  const iterations = getComplexityMultiplier(complexity) * dataSize;
  
  return async () => {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i * i + 1) + Math.sin(i) + Math.cos(i);
    }
    return result;
  };
}

function createMemoryWorkload(complexity: string, dataSize: number): () => Promise<number[]> {
  const arraySize = getComplexityMultiplier(complexity) * dataSize;
  
  return async () => {
    const arr = new Array(arraySize);
    for (let i = 0; i < arraySize; i++) {
      arr[i] = Math.random() * 1000;
    }
    
    // Sort and filter
    arr.sort((a, b) => a - b);
    return arr.filter(x => x > 500);
  };
}

function createIOWorkload(complexity: string, dataSize: number): () => Promise<string> {
  const iterations = getComplexityMultiplier(complexity) * Math.floor(dataSize / 100);
  
  return async () => {
    let result = "";
    for (let i = 0; i < iterations; i++) {
      // Simulate I/O with string operations
      result += `iteration-${i}-${Math.random()}-`;
    }
    return result;
  };
}

function createMixedWorkload(complexity: string, dataSize: number): () => Promise<any> {
  const cpuWorkload = createCPUWorkload(complexity, Math.floor(dataSize / 3));
  const memoryWorkload = createMemoryWorkload(complexity, Math.floor(dataSize / 3));
  const ioWorkload = createIOWorkload(complexity, Math.floor(dataSize / 3));
  
  return async () => {
    const [cpu, memory, io] = await Promise.all([
      cpuWorkload(),
      memoryWorkload(),
      ioWorkload(),
    ]);
    
    return { cpu, memory, io };
  };
}

function getComplexityMultiplier(complexity: string): number {
  switch (complexity) {
    case "low": return 1;
    case "medium": return 5;
    case "high": return 20;
    default: return 1;
  }
}

/**
 * Predefined benchmark suites
 */
export const BenchmarkSuites = {
  cpuIntensive: {
    name: "CPU Intensive Tasks",
    tests: [
      {
        name: "Mathematical Computations",
        fn: createSyntheticWorkload("cpu", "medium", 1000),
        iterations: 50,
        dataSize: 1000,
      },
      {
        name: "Complex Algorithms",
        fn: createSyntheticWorkload("cpu", "high", 500),
        iterations: 25,
        dataSize: 500,
      },
    ],
  },
  
  memoryIntensive: {
    name: "Memory Intensive Tasks",
    tests: [
      {
        name: "Large Array Processing",
        fn: createSyntheticWorkload("memory", "medium", 2000),
        iterations: 30,
        dataSize: 2000,
      },
      {
        name: "Data Transformation",
        fn: createSyntheticWorkload("memory", "high", 1000),
        iterations: 20,
        dataSize: 1000,
      },
    ],
  },
  
  mixed: {
    name: "Mixed Workload",
    tests: [
      {
        name: "Balanced Workload",
        fn: createSyntheticWorkload("mixed", "medium", 1000),
        iterations: 40,
        dataSize: 1000,
      },
    ],
  },
};
