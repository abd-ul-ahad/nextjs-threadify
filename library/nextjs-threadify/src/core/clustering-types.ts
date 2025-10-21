// Clustering-specific types to avoid circular dependencies

export interface TaskCluster {
  id: string;
  tasks: unknown[]; // Using unknown to avoid circular dependency
  priority: number;
  estimatedDuration: number;
  resourceType: ResourceType;
  affinity: WorkerAffinity;
}

export type ResourceType = "cpu-intensive" | "memory-intensive" | "io-bound" | "mixed";
export type WorkerAffinity = "any" | "cpu-optimized" | "memory-optimized" | "io-optimized";

export interface WorkerMetrics {
  workerId: number;
  cpuUtilization: number;
  memoryUsage: number;
  taskCount: number;
  avgTaskDuration: number;
  specialization: WorkerAffinity;
  lastActivity: number;
}

export interface ClusteringOptions {
  enableTaskClustering: boolean;
  enableWorkerSpecialization: boolean;
  enableLoadBalancing: boolean;
  clusteringStrategy: "complexity" | "resource" | "priority" | "hybrid";
  maxClusterSize: number;
  clusterTimeoutMs: number;
  enablePerformanceTracking: boolean;
  priority?: number; // Enhanced clustering priority
}

export interface ClusterStats {
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
