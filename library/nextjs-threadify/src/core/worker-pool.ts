/* eslint-disable @typescript-eslint/no-explicit-any */

// WorkerPool implementation split out from the monolith, functionally identical

import { hasWorker, isBrowser } from "./env";
import { collectTransferablesDeep } from "./transferables";
import { makeWorkerBlobUrl } from "./worker-blob";
import { nextTaskId } from "./id";
import { TaskClusterManager } from "./clustering";
import type { ClusteringOptions, ClusterStats } from "./clustering-types";
import type {
  PoolStats,
  RunOptions,
  Task,
  ThreadedOptions,
  WorkerSlot,
} from "./types";

export class WorkerPool {
  private opts: Required<ThreadedOptions>;
  private url: string | null = null;
  private workers: WorkerSlot[] = [];
  private queue: Task[] = [];
  private taskMap = new Map<
    number,
    { createdAt: number; resolve: Function; reject: Function }
  >();
  private completed = 0;
  private failed = 0;
  private latencies: number[] = [];
  private destroyed = false;
  private clusterManager: TaskClusterManager;
  private workerSpecializations: Map<number, string> = new Map();
  private performanceMetrics: Map<
    number,
    { cpu: number; memory: number; taskCount: number }
  > = new Map();

  constructor(opts: ThreadedOptions = {}) {
    const cores = (isBrowser && (navigator as any)?.hardwareConcurrency) || 4;
    const defaultPool = Math.max(1, Math.min(cores - 1, 4));
    this.opts = {
      poolSize: Math.max(1, opts.poolSize ?? defaultPool),
      maxQueue: opts.maxQueue ?? 256,
      warmup: opts.warmup ?? true,
      strategy: opts.strategy ?? "auto",
      minWorkTimeMs: opts.minWorkTimeMs ?? 6,
      saturation: opts.saturation ?? "enqueue",
      preferTransferables: opts.preferTransferables ?? true,
      name: opts.name ?? "cthread",
      timeoutMs: opts.timeoutMs ?? 10000,
      // Enhanced clustering options
      enableClustering: opts.enableClustering ?? true,
      clusteringStrategy: opts.clusteringStrategy ?? "hybrid",
      enableWorkerSpecialization: opts.enableWorkerSpecialization ?? true,
      enableLoadBalancing: opts.enableLoadBalancing ?? true,
      maxClusterSize:
        opts.maxClusterSize ?? Math.max(8, Math.floor(defaultPool * 3)),
      clusterTimeoutMs: opts.clusterTimeoutMs ?? 1000,
      enablePerformanceTracking: opts.enablePerformanceTracking ?? true,
    };

    // Initialize clustering manager with enhanced options
    const clusteringOptions: Partial<ClusteringOptions> = {
      enableTaskClustering: true,
      enableWorkerSpecialization: true,
      enableLoadBalancing: true,
      clusteringStrategy: "hybrid",
      maxClusterSize: Math.max(8, Math.floor(this.opts.poolSize * 3)),
      clusterTimeoutMs: 1000,
      enablePerformanceTracking: true,
    };

    this.clusterManager = new TaskClusterManager(clusteringOptions);

    if (hasWorker) {
      this.url = makeWorkerBlobUrl();
      for (let i = 0; i < this.opts.poolSize; i++) {
        const w = new Worker(this.url);
        const slot: WorkerSlot = { id: i, w, busy: false };
        w.onmessage = (e: MessageEvent) => this.handleWorkerMessage(slot, e);
        w.onerror = () => {
          // keep pool running on worker error
          // Intentionally empty - errors are handled elsewhere
        };
        this.workers.push(slot);

        // Initialize worker specialization and metrics
        this.workerSpecializations.set(i, "any");
        this.performanceMetrics.set(i, { cpu: 0, memory: 0, taskCount: 0 });

        // Sync with cluster manager
        this.clusterManager.setWorkerSpecialization(i, "any");
      }
      if (this.opts.warmup) this.warmup();

      // Start performance monitoring
      this.startPerformanceMonitoring();
    }
  }

  private warmup() {
    const tiny = () => 1 + 1;
    const code = tiny.toString();
    for (const slot of this.workers) {
      try {
        slot.w.postMessage({
          id: -1,
          code,
          args: [],
          preferTransferables: false,
        });
      } catch {
        // Ignore warmup errors
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    for (const slot of this.workers) {
      try {
        slot.w.terminate();
      } catch {
        // eslint-disable-next-line no-empty
      }
    }
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
    this.workers = [];
    this.queue = [];
    this.destroyed = true;
  }

  getStats(): PoolStats {
    const busy = this.workers.filter((w) => w.busy).length;
    const avg = this.latencies.length
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;
    return {
      name: this.opts.name,
      poolSize: this.workers.length,
      busy,
      idle: this.workers.length - busy,
      inFlight: busy,
      queued: this.queue.length,
      completed: this.completed,
      failed: this.failed,
      avgLatencyMs: Math.round(avg),
    };
  }

  /**
   * Get enhanced clustering statistics
   */
  getClusterStats(): ClusterStats {
    return this.clusterManager.getClusterStats();
  }

  /**
   * Configure clustering options dynamically
   */
  configureClustering(options: Partial<ClusteringOptions>): void {
    this.clusterManager = new TaskClusterManager(options);
  }

  /**
   * Get worker specialization information
   */
  getWorkerSpecializations(): Map<number, string> {
    return new Map(this.workerSpecializations);
  }

  /**
   * Manually assign worker specialization
   */
  setWorkerSpecialization(workerId: number, specialization: string): void {
    this.workerSpecializations.set(workerId, specialization);
    this.clusterManager.setWorkerSpecialization(workerId, specialization);
  }

  private handleWorkerMessage(slot: WorkerSlot, e: MessageEvent) {
    slot.busy = false;
    const msg = e.data || {};
    const { id, ok, result, error, metrics } = msg;
    const rec = this.taskMap.get(id);
    if (!rec) {
      this.pump();
      return;
    }
    this.taskMap.delete(id);
    const latency = performance.now() - rec.createdAt;
    this.latencies.push(latency);
    if (this.latencies.length > 1000) this.latencies.shift();

    // Update worker metrics with clustering data
    if (metrics) {
      this.updateWorkerMetrics(slot.id, latency, metrics);
    }

    if (ok) {
      this.completed++;
      rec.resolve(result);
    } else {
      this.failed++;
      rec.reject(error);
    }

    // Optimize clusters after task completion
    this.clusterManager.optimizeClusters();
    this.pump();
  }

  private pickFreeWorker(): WorkerSlot | null {
    // Use clustering-based worker selection if enabled
    if (this.clusterManager) {
      const availableWorkers = this.workers.filter((w) => !w.busy);
      return this.clusterManager.selectOptimalWorker(
        null as any,
        availableWorkers
      );
    }

    // Fallback to simple round-robin
    for (const slot of this.workers) if (!slot.busy) return slot;
    return null;
  }

  private pickFreeWorkerForTask(task: Task): WorkerSlot | null {
    const availableWorkers = this.workers.filter((w) => !w.busy);
    if (availableWorkers.length === 0) return null;

    // Use clustering-based worker selection
    const cluster = this.clusterManager.clusterTask(task);
    return this.clusterManager.selectOptimalWorker(cluster, availableWorkers);
  }

  private schedule(task: Task) {
    let i = this.queue.length - 1;
    while (i >= 0 && this.queue[i].priority < task.priority) i--;
    this.queue.splice(i + 1, 0, task);
    this.pump();
  }

  private pump() {
    if (!hasWorker) return;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const task = this.queue.shift();
      if (!task) break;

      if (task.signal?.aborted) {
        task.reject(
          Object.assign(new Error("Aborted"), { name: "AbortError" })
        );
        continue;
      }

      // Use intelligent worker selection based on task clustering
      const slot = this.pickFreeWorkerForTask(task);
      if (!slot) {
        // No free workers, put task back in queue
        this.queue.unshift(task);
        break;
      }

      slot.busy = true;
      const { id, code, args, preferTransferables } = task;

      this.taskMap.set(id, {
        createdAt: performance.now(),
        resolve: task.resolve,
        reject: task.reject,
      });

      if (task.timeoutAt) {
        const rem = Math.max(0, task.timeoutAt - performance.now());
        setTimeout(() => {
          if (this.taskMap.has(id)) {
            const taskRecord = this.taskMap.get(id);
            if (taskRecord) {
              taskRecord.reject(
                Object.assign(new Error("Timeout"), { name: "TimeoutError" })
              );
            }
            this.taskMap.delete(id);
          }
        }, rem);
      }

      try {
        const transfers = preferTransferables
          ? collectTransferablesDeep(args)
          : [];

        // Enhanced message with clustering metadata
        const message = {
          id,
          code,
          args,
          preferTransferables,
          clustering: {
            workerId: slot.id,
            specialization: this.workerSpecializations?.get(slot.id) || "any",
            enableMetrics: true,
          },
        };

        slot.w.postMessage(message, transfers);
      } catch (err) {
        slot.busy = false;
        this.taskMap.delete(id);
        task.reject(err);
      }
    }
  }

  private async runInline(code: string, args: any[]) {
    const fn = new Function(
      "ARGS",
      `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`
    );
    return fn(args);
  }

  /**
   * Start performance monitoring for clustering optimization
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      if (this.destroyed) return;

      // Update worker specializations based on performance patterns
      this.updateWorkerSpecializations();

      // Optimize clusters periodically
      this.clusterManager.optimizeClusters();

      // Clean up old performance data
      this.cleanupPerformanceData();
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Update worker metrics for clustering
   */
  private updateWorkerMetrics(
    workerId: number,
    taskDuration: number,
    metrics: { cpu: number; memory: number }
  ): void {
    const current = this.performanceMetrics.get(workerId) || {
      cpu: 0,
      memory: 0,
      taskCount: 0,
    };
    current.taskCount++;
    current.cpu = (current.cpu + metrics.cpu) / 2; // Moving average
    current.memory = (current.memory + metrics.memory) / 2; // Moving average

    this.performanceMetrics.set(workerId, current);

    // Update cluster manager with metrics
    this.clusterManager.updateWorkerMetrics(workerId, taskDuration, metrics);
  }

  /**
   * Dynamically update worker specializations based on performance patterns
   */
  private updateWorkerSpecializations(): void {
    const metricsEntries = Array.from(this.performanceMetrics.entries());

    for (const [workerId, workerMetrics] of metricsEntries) {
      const specialization = this.determineWorkerSpecialization(
        workerId,
        workerMetrics
      );
      this.workerSpecializations.set(workerId, specialization);
      this.clusterManager.setWorkerSpecialization(workerId, specialization);
    }
  }

  /**
   * Determine optimal specialization for a worker based on its performance patterns
   */
  private determineWorkerSpecialization(
    workerId: number,
    metrics: { cpu: number; memory: number; taskCount: number }
  ): string {
    if (metrics.taskCount < 5) return "any"; // Not enough data

    const cpuRatio = metrics.cpu / 100;
    const memoryRatio = metrics.memory / 100;

    if (cpuRatio > 0.7 && memoryRatio < 0.5) return "cpu-optimized";
    if (memoryRatio > 0.7 && cpuRatio < 0.5) return "memory-optimized";
    if (cpuRatio > 0.6 && memoryRatio > 0.6) return "io-optimized";

    return "any";
  }

  /**
   * Clean up old performance data to prevent memory leaks
   */
  private cleanupPerformanceData(): void {
    const now = performance.now();
    const maxAge = 300000; // 5 minutes

    // Reset metrics for workers that haven't been active
    for (const [workerId, metrics] of this.performanceMetrics.entries()) {
      if (now - metrics.taskCount > maxAge) {
        this.performanceMetrics.set(workerId, {
          cpu: 0,
          memory: 0,
          taskCount: 0,
        });
      }
    }
  }

  run(code: string, args: any[], options: RunOptions = {}) {
    const id = nextTaskId();

    const strategy = options.strategy ?? this.opts.strategy;

    if (!hasWorker || strategy === "inline") {
      return this.runInline(code, args);
    }

    if (strategy === "auto" && this.workers.length === 0) {
      return this.runInline(code, args);
    }

    const saturated = this.queue.length >= this.opts.maxQueue;
    if (saturated) {
      const policy = this.opts.saturation;
      if (policy === "reject") {
        return Promise.reject(
          Object.assign(new Error("Queue saturated"), {
            name: "SaturationError",
          })
        );
      } else if (policy === "inline") {
        return this.runInline(code, args);
      }
    }

    const preferTransferables =
      options.preferTransferables ?? this.opts.preferTransferables;

    if (options.signal?.aborted) {
      return Promise.reject(
        Object.assign(new Error("Aborted"), { name: "AbortError" })
      );
    }

    return new Promise<any>((resolve, reject) => {
      const t: Task = {
        id,
        code,
        args,
        resolve,
        reject,
        priority: options.priority ?? 0,
        timeoutAt:
          options.timeoutMs ?? this.opts.timeoutMs
            ? performance.now() + (options.timeoutMs ?? this.opts.timeoutMs)
            : undefined,
        signal: options.signal ?? null,
        preferTransferables,
      };

      if (t.signal) {
        const listener = () => {
          const idx = this.queue.findIndex((q) => q.id === t.id);
          if (idx >= 0) {
            this.queue.splice(idx, 1);
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          }
          try {
            t.signal?.removeEventListener("abort", listener as any);
          } catch {
            // eslint-disable-next-line no-empty
          }
        };
        t.signal.addEventListener("abort", listener, { once: true });
      }

      this.schedule(t);
    });
  }
}
