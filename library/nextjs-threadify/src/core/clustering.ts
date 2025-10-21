// Advanced clustering and optimization techniques for nextjs-threadify

import type { Task, WorkerSlot } from "./types";
import type { TaskCluster, ResourceType, WorkerAffinity, WorkerMetrics, ClusteringOptions, ClusterStats } from "./clustering-types";

export class TaskClusterManager {
  private clusters: Map<string, TaskCluster> = new Map();
  private workerMetrics: Map<number, WorkerMetrics> = new Map();
  private workerSpecializations: Map<number, string> = new Map();
  private clusteringOptions: ClusteringOptions;
  private performanceHistory: Array<{ timestamp: number; metrics: ClusterStats }> = [];

  constructor(options: Partial<ClusteringOptions> = {}) {
    this.clusteringOptions = {
      enableTaskClustering: true,
      enableWorkerSpecialization: true,
      enableLoadBalancing: true,
      clusteringStrategy: "hybrid",
      maxClusterSize: 10,
      clusterTimeoutMs: 1000,
      enablePerformanceTracking: true,
      ...options,
    };
  }

  /**
   * Analyze task complexity and resource requirements
   */
  analyzeTask(task: Task): { complexity: number; resourceType: ResourceType; estimatedDuration: number } {
    const codeSize = task.code.length;
    const argSize = JSON.stringify(task.args).length;
    
    // Estimate complexity based on code patterns
    const complexity = this.estimateComplexity(task.code);
    
    // Determine resource type based on code analysis
    const resourceType = this.determineResourceType(task.code);
    
    // Estimate duration based on complexity and historical data
    const estimatedDuration = this.estimateDuration(complexity, codeSize, argSize);
    
    return { complexity, resourceType, estimatedDuration };
  }

  /**
   * Create or update task clusters based on clustering strategy
   */
  clusterTask(task: Task): TaskCluster {
    const analysis = this.analyzeTask(task);
    const clusterKey = this.generateClusterKey(task, analysis);
    
    let cluster = this.clusters.get(clusterKey);
    
    if (!cluster || cluster.tasks.length >= this.clusteringOptions.maxClusterSize) {
      cluster = this.createNewCluster(task, analysis);
      this.clusters.set(clusterKey, cluster);
    } else {
      cluster.tasks.push(task);
      cluster.priority = Math.max(cluster.priority, task.priority);
    }
    
    return cluster;
  }

  /**
   * Select optimal worker for task execution based on clustering and specialization
   */
  selectOptimalWorker(cluster: TaskCluster | null, availableWorkers: WorkerSlot[]): WorkerSlot | null {
    if (availableWorkers.length === 0) return null;
    
    // Multi-factor worker selection
    const scoredWorkers = availableWorkers.map(worker => {
      const metrics = this.workerMetrics?.get(worker.id);
      const specialization = this.workerSpecializations?.get(worker.id) || "any";
      
      // Calculate comprehensive performance score
      let score = 0;
      
      // 1. Specialization match (40% weight)
      if (cluster?.affinity && cluster.affinity !== "any") {
        if (specialization === cluster.affinity) score += 40;
        else if (specialization === "any") score += 20;
        else score += 5;
      } else {
        score += 30; // Default for any affinity
      }
      
      // 2. Load balancing (25% weight)
      const load = this.getWorkerLoad(worker);
      score += Math.max(0, 25 - (load * 25));
      
      // 3. Performance history (20% weight)
      if (metrics) {
        const efficiency = Math.max(0, 1 - (metrics.avgTaskDuration / 1000));
        score += efficiency * 20;
      } else {
        score += 15; // New worker gets medium score
      }
      
      // 4. Resource utilization (15% weight)
      if (metrics) {
        const cpuScore = Math.max(0, 15 - (metrics.cpuUtilization * 0.15));
        const memoryScore = Math.max(0, 15 - (metrics.memoryUsage * 0.15));
        score += (cpuScore + memoryScore) / 2;
      } else {
        score += 10;
      }
      
      return { worker, score };
    });
    
    // Sort by score and select the best worker
    scoredWorkers.sort((a, b) => b.score - a.score);
    return scoredWorkers[0].worker;
  }

  /**
   * Set worker specialization
   */
  setWorkerSpecialization(workerId: number, specialization: string): void {
    this.workerSpecializations.set(workerId, specialization);
  }

  /**
   * Get worker specialization
   */
  getWorkerSpecialization(workerId: number): string {
    return this.workerSpecializations?.get(workerId) || "any";
  }

  /**
   * Update worker metrics for performance tracking
   */
  updateWorkerMetrics(workerId: number, taskDuration: number, resourceUsage: { cpu: number; memory: number }) {
    const metrics = this.workerMetrics?.get(workerId) || {
      workerId,
      cpuUtilization: 0,
      memoryUsage: 0,
      taskCount: 0,
      avgTaskDuration: 0,
      specialization: "any" as WorkerAffinity,
      lastActivity: performance.now(),
    };

    metrics.taskCount++;
    metrics.avgTaskDuration = (metrics.avgTaskDuration * (metrics.taskCount - 1) + taskDuration) / metrics.taskCount;
    metrics.cpuUtilization = resourceUsage.cpu;
    metrics.memoryUsage = resourceUsage.memory;
    metrics.lastActivity = performance.now();

    this.workerMetrics.set(workerId, metrics);
  }

  /**
   * Get comprehensive clustering statistics
   */
  getClusterStats(): ClusterStats {
    const activeClusters = Array.from(this.clusters.values()).filter(c => c.tasks.length > 0);
    const totalTasks = activeClusters.reduce((sum, c) => sum + c.tasks.length, 0);
    const avgClusterSize = activeClusters.length > 0 ? totalTasks / activeClusters.length : 0;
    
    const workerMetrics = Array.from(this.workerMetrics.values());
    const avgCpuUtilization = workerMetrics.length > 0 
      ? workerMetrics.reduce((sum, w) => sum + w.cpuUtilization, 0) / workerMetrics.length 
      : 0;
    const avgMemoryUsage = workerMetrics.length > 0 
      ? workerMetrics.reduce((sum, w) => sum + w.memoryUsage, 0) / workerMetrics.length 
      : 0;

    const loadBalanceScore = this.calculateLoadBalanceScore();

    return {
      totalClusters: this.clusters.size,
      activeClusters: activeClusters.length,
      avgClusterSize,
      clusteringEfficiency: this.calculateClusteringEfficiency(),
      loadBalanceScore,
      resourceUtilization: {
        cpu: avgCpuUtilization,
        memory: avgMemoryUsage,
      },
    };
  }

  /**
   * Clean up expired clusters and optimize performance
   */
  optimizeClusters(): void {
    const now = performance.now();
    
    // Remove expired clusters
    for (const [key, cluster] of this.clusters.entries()) {
      if (cluster.tasks.length === 0 && 
          now - cluster.estimatedDuration > this.clusteringOptions.clusterTimeoutMs) {
        this.clusters.delete(key);
      }
    }

    // Update performance history
    if (this.clusteringOptions.enablePerformanceTracking) {
      this.performanceHistory.push({
        timestamp: now,
        metrics: this.getClusterStats(),
      });

      // Keep only last 100 entries
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }
    }
  }

  private estimateComplexity(code: string): number {
    // Analyze code patterns to estimate computational complexity
    const patterns = {
      loops: (code.match(/for\s*\(|while\s*\(|do\s*{/g) || []).length,
      recursion: (code.match(/function.*\w+\(.*\)\s*{[\s\S]*?\w+\(/g) || []).length,
      mathOps: (code.match(/Math\.|sqrt|pow|sin|cos|tan/g) || []).length,
      arrayOps: (code.match(/\.map\(|\.filter\(|\.reduce\(|\.forEach\(/g) || []).length,
    };

    return patterns.loops * 2 + patterns.recursion * 3 + patterns.mathOps * 1.5 + patterns.arrayOps * 1.2;
  }

  private determineResourceType(code: string): ResourceType {
    const cpuIntensivePatterns = /Math\.|sqrt|pow|sin|cos|tan|for\s*\(|while\s*\(/g;
    const memoryIntensivePatterns = /new\s+Array|new\s+Uint8Array|new\s+Float32Array|\.push\(|\.concat\(/g;
    const ioPatterns = /fetch\(|XMLHttpRequest|FileReader|Blob/g;

    const cpuScore = (code.match(cpuIntensivePatterns) || []).length;
    const memoryScore = (code.match(memoryIntensivePatterns) || []).length;
    const ioScore = (code.match(ioPatterns) || []).length;

    if (ioScore > cpuScore && ioScore > memoryScore) return "io-bound";
    if (memoryScore > cpuScore) return "memory-intensive";
    if (cpuScore > 0) return "cpu-intensive";
    return "mixed";
  }

  private estimateDuration(complexity: number, codeSize: number, argSize: number): number {
    // Base estimation formula - can be improved with machine learning
    const baseTime = complexity * 0.1; // 0.1ms per complexity unit
    const sizeFactor = Math.log(codeSize + argSize) * 0.05; // Logarithmic scaling
    return Math.max(1, baseTime + sizeFactor);
  }

  private generateClusterKey(task: Task, analysis: ReturnType<typeof this.analyzeTask>): string {
    const { clusteringStrategy } = this.clusteringOptions;
    
    switch (clusteringStrategy) {
      case "complexity":
        return `complexity-${Math.floor(analysis.complexity / 10)}`;
      case "resource":
        return `resource-${analysis.resourceType}`;
      case "priority":
        return `priority-${task.priority}`;
      case "hybrid":
        return `hybrid-${analysis.resourceType}-${Math.floor(analysis.complexity / 5)}-${task.priority}`;
      default:
        return "default";
    }
  }

  private createNewCluster(task: Task, analysis: ReturnType<typeof this.analyzeTask>): TaskCluster {
    return {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tasks: [task],
      priority: task.priority,
      estimatedDuration: analysis.estimatedDuration,
      resourceType: analysis.resourceType,
      affinity: this.mapResourceTypeToAffinity(analysis.resourceType),
    };
  }

  private mapResourceTypeToAffinity(resourceType: ResourceType): WorkerAffinity {
    switch (resourceType) {
      case "cpu-intensive":
        return "cpu-optimized";
      case "memory-intensive":
        return "memory-optimized";
      case "io-bound":
        return "io-optimized";
      default:
        return "any";
    }
  }

  private filterWorkersBySpecialization(workers: WorkerSlot[], affinity: WorkerAffinity): WorkerSlot[] {
    if (affinity === "any") return workers;
    
    return workers.filter(worker => {
      const metrics = this.workerMetrics?.get(worker.id);
      return !metrics || metrics.specialization === affinity || metrics.specialization === "any";
    });
  }

  private selectWorkerByLoadBalance(workers: WorkerSlot[]): WorkerSlot | null {
    if (workers.length === 0) return null;
    
    // Find worker with lowest load
    let bestWorker = workers[0];
    let lowestLoad = this.getWorkerLoad(bestWorker);
    
    for (let i = 1; i < workers.length; i++) {
      const load = this.getWorkerLoad(workers[i]);
      if (load < lowestLoad) {
        lowestLoad = load;
        bestWorker = workers[i];
      }
    }
    
    return bestWorker;
  }

  private getWorkerLoad(worker: WorkerSlot): number {
    const metrics = this.workerMetrics?.get(worker.id);
    if (!metrics) return 0;
    
    // Calculate load based on CPU utilization, memory usage, and task count
    return metrics.cpuUtilization * 0.4 + metrics.memoryUsage * 0.3 + metrics.taskCount * 0.3;
  }

  private calculateClusteringEfficiency(): number {
    const activeClusters = Array.from(this.clusters.values()).filter(c => c.tasks.length > 0);
    if (activeClusters.length === 0) return 0;
    
    const totalTasks = activeClusters.reduce((sum, c) => sum + c.tasks.length, 0);
    const avgClusterSize = totalTasks / activeClusters.length;
    
    // Efficiency is higher when clusters are well-sized (not too small, not too large)
    const optimalSize = 5; // Optimal cluster size
    const efficiency = 1 - Math.abs(avgClusterSize - optimalSize) / optimalSize;
    
    return Math.max(0, Math.min(1, efficiency));
  }

  private calculateLoadBalanceScore(): number {
    const workerMetrics = Array.from(this.workerMetrics.values());
    if (workerMetrics.length <= 1) return 1;
    
    const loads = workerMetrics.map(w => this.getWorkerLoad({ id: w.workerId, w: null as unknown, busy: false }));
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    
    // Lower variance = better load balance
    return Math.max(0, 1 - Math.sqrt(variance) / avgLoad);
  }
}
