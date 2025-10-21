// Comprehensive clustering examples for nextjs-threadify

import React, { useState } from "react";
import {
  // Basic threading
  threaded,
  configureThreaded,
  getThreadedStats,
  
  // Enhanced clustering APIs
  clusteredThreaded,
  cpuIntensive,
  memoryIntensive,
  ioBound,
  highPriority,
  clusteredBatch,
  smartParallelMap,
  performanceCluster,
  
  // Clustering management
  configureClustering,
  getClusterStats,
  getWorkerSpecializations,
  setWorkerSpecialization,
  
  // Performance benchmarking
  benchmarkClustering,
  runBenchmarkSuite,
  startPerformanceMonitoring,
  createSyntheticWorkload,
  BenchmarkSuites,
} from "../dist/index";

// Example 1: Basic clustering configuration
export function setupClustering() {
  // Configure the global pool with clustering enabled
  configureThreaded({
    poolSize: 8,
    enableClustering: true,
    clusteringStrategy: "hybrid",
    enableWorkerSpecialization: true,
    enableLoadBalancing: true,
    maxClusterSize: 10,
    clusterTimeoutMs: 2000,
    enablePerformanceTracking: true,
  });
  
  console.log("Clustering configured successfully");
}

// Example 2: CPU-intensive tasks with specialized clustering
export function cpuIntensiveExample() {
  // Heavy mathematical computation
  const fibonacci = cpuIntensive(async (n: number): Promise<number> => {
    if (n <= 1) return n;
    const [a, b] = await Promise.all([fibonacci(n - 1), fibonacci(n - 2)]);
    return a + b;
  });
  
  // Matrix multiplication
  const matrixMultiply = cpuIntensive((matrices: { a: number[][]; b: number[][] }) => {
    const { a, b } = matrices;
    const result: number[][] = [];
    
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    
    return result;
  });
  
  return { fibonacci, matrixMultiply };
}

// Example 3: Memory-intensive tasks with specialized clustering
export function memoryIntensiveExample() {
  // Large array processing
  const processLargeArray = memoryIntensive((data: number[]) => {
    // Create multiple copies and transformations
    const processed = data.map(x => x * 2);
    const filtered = processed.filter(x => x > 100);
    const sorted = filtered.sort((a, b) => a - b);
    const chunked = [];
    
    for (let i = 0; i < sorted.length; i += 1000) {
      chunked.push(sorted.slice(i, i + 1000));
    }
    
    return chunked;
  });
  
  // Image processing simulation
  const processImage = memoryIntensive((imageData: Uint8Array) => {
    const processed = new Uint8Array(imageData.length);
    for (let i = 0; i < imageData.length; i += 4) {
      // Apply filters
      processed[i] = Math.min(255, imageData[i] * 1.2);     // R
      processed[i + 1] = Math.min(255, imageData[i + 1] * 1.1); // G
      processed[i + 2] = Math.min(255, imageData[i + 2] * 0.9); // B
      processed[i + 3] = imageData[i + 3];                   // A
    }
    return processed;
  });
  
  return { processLargeArray, processImage };
}

// Example 4: I/O-bound tasks with specialized clustering
export function ioBoundExample() {
  // String processing (simulates I/O operations)
  const processText = ioBound((text: string) => {
    // Simulate text processing operations
    const lines = text.split('\n');
    const processed = lines.map(line => {
      // Simulate complex text transformations
      return line
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .filter(word => word.length > 3)
        .join(' ');
    });
    
    return processed.join('\n');
  });
  
  // Data serialization
  const serializeData = ioBound((data: any) => {
    // Simulate complex serialization
    const jsonString = JSON.stringify(data, null, 2);
    const compressed = jsonString.replace(/\s+/g, ' ').trim();
    return compressed;
  });
  
  return { processText, serializeData };
}

// Example 5: High-priority tasks with priority clustering
export function highPriorityExample() {
  // Critical calculations
  const criticalCalculation = highPriority((data: number[]) => {
    return data.reduce((sum, num) => sum + Math.sqrt(num), 0);
  });
  
  // Real-time processing
  const realTimeProcess = highPriority((input: any) => {
    // Simulate real-time data processing
    const timestamp = Date.now();
    return {
      ...input,
      processedAt: timestamp,
      priority: 'high',
    };
  });
  
  return { criticalCalculation, realTimeProcess };
}

// Example 6: Batch processing with intelligent clustering
export async function batchProcessingExample() {
  const data = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    category: ['A', 'B', 'C'][i % 3],
  }));
  
  // Process in batches with clustering
  const results = await clusteredBatch(
    data,
    (item: any) => ({
      ...item,
      processed: true,
      computed: Math.sqrt(item.value) + Math.sin(item.value),
      timestamp: Date.now(),
    }),
    {
      batchSize: 100,
      clusterStrategy: "similarity",
      priority: 5,
    }
  );
  
  return results;
}

// Example 7: Smart parallel processing with adaptive clustering
export async function smartParallelExample() {
  const numbers = Array.from({ length: 5000 }, (_, i) => i);
  
  // Smart parallel processing with clustering optimization
  const results = await smartParallelMap(
    numbers,
    (num: any, index: any, all: any) => {
      // Complex computation for each number
      let result = num;
      for (let i = 0; i < 100; i++) {
        result = Math.sqrt(result + i) + Math.sin(result);
      }
      return {
        original: num,
        computed: result,
        index,
        total: all.length,
      };
    },
    {
      clusteringStrategy: "hybrid",
      adaptiveBatching: true,
      priority: 3,
    }
  );
  
  return results;
}

// Example 8: Performance clustering for similar tasks
export async function performanceClusteringExample() {
  // Create similar tasks
  const tasks = Array.from({ length: 50 }, (_, i) => ({
    fn: (x: number) => Math.sqrt(x * x + i),
    args: [Math.random() * 1000] as [number],
    priority: i % 3,
  }));
  
  // Process with performance clustering
  const results = await performanceCluster(tasks, {
    priority: 5,
    clustering: {
      forceCluster: true,
      clusterId: "performance-test",
    },
  });
  
  return results;
}

// Example 9: Worker specialization management
export function workerSpecializationExample() {
  // Get current worker specializations
  const specializations = getWorkerSpecializations();
  console.log("Current worker specializations:", specializations);
  
  // Manually set worker specializations
  setWorkerSpecialization(0, "cpu-optimized");
  setWorkerSpecialization(1, "memory-optimized");
  setWorkerSpecialization(2, "io-optimized");
  
  console.log("Worker specializations updated");
}

// Example 10: Performance monitoring and benchmarking
export function performanceMonitoringExample() {
  // Start real-time monitoring
  const stopMonitoring = startPerformanceMonitoring(2000, (stats: any) => {
    console.log("Performance Stats:", {
      pool: {
        busy: stats.busy,
        idle: stats.idle,
        queued: stats.queued,
        avgLatency: stats.avgLatencyMs,
      },
      clustering: stats.clustering ? {
        totalClusters: stats.clustering.totalClusters,
        activeClusters: stats.clustering.activeClusters,
        efficiency: stats.clustering.clusteringEfficiency,
        loadBalance: stats.clustering.loadBalanceScore,
      } : null,
    });
  });
  
  // Run benchmark suite
  const runBenchmarks = async () => {
    console.log("Running benchmark suite...");
    const results = await runBenchmarkSuite(BenchmarkSuites.cpuIntensive);
    console.log("Benchmark results:", results);
    
    // Stop monitoring after benchmarks
    stopMonitoring();
  };
  
  return { stopMonitoring, runBenchmarks };
}

// Example 11: Comprehensive clustering benchmark
export async function comprehensiveBenchmark() {
  // Create different types of workloads
  const workloads = {
    cpu: createSyntheticWorkload("cpu", "medium", 1000),
    memory: createSyntheticWorkload("memory", "medium", 1000),
    io: createSyntheticWorkload("io", "medium", 1000),
    mixed: createSyntheticWorkload("mixed", "medium", 1000),
  };
  
  const results: any = {};
  
  // Benchmark each workload type
  for (const [type, workload] of Object.entries(workloads)) {
    console.log(`Benchmarking ${type} workload...`);
    results[type] = await benchmarkClustering(workload, 50, 1000);
  }
  
  return results;
}

// Example 12: Dynamic clustering configuration
export function dynamicClusteringExample() {
  // Configure clustering based on current system load
  const configureBasedOnLoad = () => {
    const stats = getThreadedStats();
    const clusterStats = getClusterStats();
    
    if (stats.queued > 50) {
      // High load - increase clustering efficiency
      configureClustering({
        maxClusterSize: 15,
        clusteringStrategy: "priority",
        enableLoadBalancing: true,
      });
      console.log("Configured for high load");
    } else if (clusterStats.clusteringEfficiency < 0.7) {
      // Low efficiency - optimize clustering
      configureClustering({
        clusteringStrategy: "hybrid",
        maxClusterSize: 8,
        clusterTimeoutMs: 1000,
      });
      console.log("Optimized clustering configuration");
    }
  };
  
  return configureBasedOnLoad;
}

// Example 13: Complete application setup
export async function completeClusteringSetup() {
  console.log("Setting up comprehensive clustering...");
  
  // 1. Configure clustering
  setupClustering();
  
  // 2. Set up worker specializations
  workerSpecializationExample();
  
  // 3. Start performance monitoring
  const { stopMonitoring } = performanceMonitoringExample();
  
  // 4. Run comprehensive benchmarks
  const benchmarkResults = await comprehensiveBenchmark();
  console.log("Benchmark results:", benchmarkResults);
  
  // 5. Demonstrate different task types
  const cpuTasks = cpuIntensiveExample();
  const memoryTasks = memoryIntensiveExample();
  const ioTasks = ioBoundExample();
  const priorityTasks = highPriorityExample();
  
  // 6. Run batch processing
  const batchResults = await batchProcessingExample();
  console.log("Batch processing completed:", batchResults.length, "items");
  
  // 7. Run smart parallel processing
  const parallelResults = await smartParallelExample();
  console.log("Smart parallel processing completed:", parallelResults.length, "items");
  
  // 8. Run performance clustering
  const performanceResults = await performanceClusteringExample();
  console.log("Performance clustering completed:", performanceResults.length, "tasks");
  
  // 9. Get final statistics
  const finalStats = getThreadedStats();
  const finalClusterStats = getClusterStats();
  
  console.log("Final Statistics:", {
    pool: finalStats,
    clustering: finalClusterStats,
  });
  
  // 10. Cleanup
  stopMonitoring();
  
  return {
    cpuTasks,
    memoryTasks,
    ioTasks,
    priorityTasks,
    batchResults,
    parallelResults,
    performanceResults,
    finalStats,
    finalClusterStats,
  };
}

// Example 14: React component with clustering
export function ClusteringDemoComponent() {
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  
  const runClusteringDemo = async () => {
    setLoading(true);
    try {
      const demoResults = await completeClusteringSetup();
      setResults(demoResults);
    } catch (error) {
      console.error("Clustering demo failed:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2>NextJS Threadify Clustering Demo</h2>
      <button onClick={runClusteringDemo} disabled={loading}>
        {loading ? "Running Clustering Demo..." : "Start Clustering Demo"}
      </button>
      
      {results && (
        <div>
          <h3>Results</h3>
          <p>Pool Size: {results.finalStats?.poolSize}</p>
          <p>Completed Tasks: {results.finalStats?.completed}</p>
          <p>Clustering Efficiency: {results.finalClusterStats?.clusteringEfficiency?.toFixed(2)}</p>
          <p>Load Balance Score: {results.finalClusterStats?.loadBalanceScore?.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

// Export all examples
export const ClusteringExamples = {
  setupClustering,
  cpuIntensiveExample,
  memoryIntensiveExample,
  ioBoundExample,
  highPriorityExample,
  batchProcessingExample,
  smartParallelExample,
  performanceClusteringExample,
  workerSpecializationExample,
  performanceMonitoringExample,
  comprehensiveBenchmark,
  dynamicClusteringExample,
  completeClusteringSetup,
  ClusteringDemoComponent,
};
