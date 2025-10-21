// Enhanced clustering-aware APIs for nextjs-threadify

import type { RunOptions } from "../core/types";
import { getPool } from "./pool";

/**
 * Enhanced threaded function with clustering support
 */
export function clusteredThreaded<T extends (...args: unknown[]) => unknown>(
  fn: T,
  defaults: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const code = fn.toString();
  return (...args: Parameters<T>) => {
    const pool = getPool();
    return pool.run(code, args, {
      ...defaults,
      clustering: {
        forceCluster: true,
        clusterId: `clustered-${Date.now()}-${Math.random()}`,
        workerAffinity: "any",
        priority: 10,
        ...defaults.clustering,
      },
      timeoutMs: defaults.timeoutMs || 5000,
      minWorkTimeMs: defaults.minWorkTimeMs || 1,
    });
  };
}

/**
 * CPU-intensive task wrapper with specialized clustering
 */
export function cpuIntensive<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return clusteredThreaded(fn, {
    ...options,
    clustering: {
      workerAffinity: "cpu-optimized",
      forceCluster: true,
      clusterId: `cpu-intensive-${Date.now()}`,
      priority: 15,
      ...options.clustering,
    },
    priority: (options.priority || 0) + 5,
    timeoutMs: options.timeoutMs || 10000,
    minWorkTimeMs: options.minWorkTimeMs || 0.1,
  });
}

/**
 * Memory-intensive task wrapper with specialized clustering
 */
export function memoryIntensive<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return clusteredThreaded(fn, {
    ...options,
    clustering: {
      workerAffinity: "memory-optimized",
      forceCluster: true,
      clusterId: `memory-intensive-${Date.now()}`,
      priority: 12,
      ...options.clustering,
    },
    priority: (options.priority || 0) + 4,
    timeoutMs: options.timeoutMs || 8000,
    minWorkTimeMs: options.minWorkTimeMs || 0.2,
  });
}

/**
 * I/O-bound task wrapper with specialized clustering
 */
export function ioBound<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return clusteredThreaded(fn, {
    ...options,
    clustering: {
      workerAffinity: "io-optimized",
      forceCluster: true,
      ...options.clustering,
    },
  });
}

/**
 * High-priority task wrapper with priority clustering
 */
export function highPriority<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return clusteredThreaded(fn, {
    ...options,
    priority: (options.priority || 0) + 10,
    clustering: {
      forceCluster: true,
      ...options.clustering,
    },
  });
}

/**
 * Batch processing with intelligent clustering
 */
export async function clusteredBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  options: RunOptions & { 
    batchSize?: number;
    clusterStrategy?: "similarity" | "size" | "priority";
  } = {}
): Promise<R[]> {
  const pool = getPool();
  const batchSize = options.batchSize || Math.max(1, Math.floor(items.length / pool.getStats().poolSize));
  
  // Group items into clusters based on strategy
  const clusters = createIntelligentClusters(items, processor, batchSize);
  
  // Process each cluster in parallel
  const results = await Promise.all(
    clusters.map(async (cluster) => {
      const clusterProcessor = clusteredThreaded(
        async (...args: unknown[]) => {
          const clusterItems = args[0] as T[];
          const promises = clusterItems.map((item, index) => processor(item, cluster.startIndex + index));
          return Promise.all(promises);
        },
        {
          ...options,
          clustering: {
            clusterId: cluster.id,
            forceCluster: true,
            ...options.clustering,
          },
        }
      );
      
      return clusterProcessor(cluster.items) as Promise<R[]>;
    })
  );
  
  return results.flat();
}

/**
 * Smart parallel processing with clustering optimization
 */
export async function smartParallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number, all: T[]) => R | Promise<R>,
  options: RunOptions & {
    clusteringStrategy?: "complexity" | "resource" | "priority" | "hybrid";
    adaptiveBatching?: boolean;
  } = {}
): Promise<R[]> {
  const pool = getPool();
  const stats = pool.getStats();
  
  // Adaptive batching based on current load
  let chunkSize = Math.max(1, Math.floor(items.length / Math.max(1, stats.poolSize)));
  
  if (options.adaptiveBatching) {
    const loadFactor = stats.queued / Math.max(1, stats.poolSize);
    chunkSize = Math.max(1, Math.floor(chunkSize * (1 + loadFactor)));
  }
  
  // Create intelligent clusters
  const clusters = createIntelligentClusters(items, (item, index) => mapper(item, index, items), chunkSize);
  
  // Process with clustering-aware execution
  const results = await Promise.all(
    clusters.map(async (cluster, clusterIndex) => {
      const clusterMapper = clusteredThreaded(
        async (...args: unknown[]) => {
          const clusterItems = args[0] as T[];
          const promises = clusterItems.map((item, localIndex) => 
            mapper(item, cluster.startIndex + localIndex, items)
          );
          return Promise.all(promises);
        },
        {
          ...options,
          clustering: {
            clusterId: `smart-parallel-${clusterIndex}`,
            forceCluster: true,
            ...options.clustering,
          },
        }
      );
      
      return clusterMapper(cluster.items) as Promise<R[]>;
    })
  );
  
  return results.flat();
}

/**
 * Performance-optimized clustering for similar tasks
 */
export function performanceCluster<T extends (...args: unknown[]) => unknown>(
  tasks: Array<{ fn: T; args: Parameters<T>; priority?: number }>,
  options: RunOptions = {}
): Promise<Array<Awaited<ReturnType<T>>>> {
  // Group tasks by similarity (code similarity, argument patterns)
  const clusters = groupTasksBySimilarity(tasks);
  
  // Process each cluster with optimized execution
  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterProcessor = clusteredThreaded(
        (...args: unknown[]) => {
          const taskGroup = args[0] as Array<{ fn: T; args: Parameters<T>; priority?: number }>;
          return taskGroup.map(({ fn, args }) => fn(...args));
        },
        {
          ...options,
          priority: Math.max(...cluster.map(t => t.priority || 0)),
          clustering: {
            clusterId: `perf-cluster-${Date.now()}`,
            forceCluster: true,
            ...options.clustering,
          },
        }
      );
      
      return clusterProcessor(cluster) as Promise<Array<Awaited<ReturnType<T>>>>;
    })
  ).then(results => results.flat());
}

// Helper functions

interface TaskCluster<T> {
  id: string;
  items: T[];
  startIndex: number;
  priority: number;
}

function createIntelligentClusters<T>(
  items: T[],
  processor: (item: T, index: number) => unknown,
  batchSize: number
): TaskCluster<T>[] {
  const clusters: TaskCluster<T>[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const clusterItems = items.slice(i, i + batchSize);
    clusters.push({
      id: `cluster-${i}-${Date.now()}`,
      items: clusterItems,
      startIndex: i,
      priority: 0, // Could be enhanced with priority analysis
    });
  }
  
  return clusters;
}

function groupTasksBySimilarity<T extends (...args: unknown[]) => unknown>(
  tasks: Array<{ fn: T; args: Parameters<T>; priority?: number }>
): Array<Array<{ fn: T; args: Parameters<T>; priority?: number }>> {
  // Simple similarity grouping based on function code length and argument count
  // This could be enhanced with more sophisticated similarity algorithms
  const groups = new Map<string, typeof tasks>();
  
  for (const task of tasks) {
    const key = `${task.fn.toString().length}-${task.args.length}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    const group = groups.get(key);
    if (group) {
      group.push(task);
    }
  }
  
  return Array.from(groups.values());
}
