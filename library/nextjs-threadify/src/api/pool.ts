// Global pool configuration and lifecycle management

import { isBrowser, hasWorker } from "../core/env";
import { WorkerPool } from "../core/worker-pool";
import type { PoolStats, ThreadedOptions } from "../core/types";
import type { ClusteringOptions, ClusterStats } from "../core/clustering-types";

let __pool: WorkerPool | null = null;
let __poolOpts: ThreadedOptions | null = null;

/** Configure the global threaded pool. */
export function configureThreaded(opts: ThreadedOptions = {}) {
  __poolOpts = { ...(__poolOpts || {}), ...opts };
  if (__pool && isBrowser) {
    __pool.destroy();
    __pool = null;
  }
}

export function getPool(): WorkerPool {
  if (!isBrowser || !hasWorker) {
    return new WorkerPool({
      ...(__poolOpts || {}),
      poolSize: 0,
      strategy: "inline",
      warmup: false,
    });
  }
  if (!__pool) {
    __pool = new WorkerPool(__poolOpts || {});
  }
  return __pool;
}

/** Get a diagnostic snapshot of the current global pool. */
export function getThreadedStats(): PoolStats {
  const pool = getPool();
  const stats = pool.getStats();
  const clusterStats = pool.getClusterStats();
  
  return {
    ...stats,
    clustering: clusterStats,
  };
}

/** Get detailed clustering statistics. */
export function getClusterStats(): ClusterStats {
  return getPool().getClusterStats();
}

/** Configure clustering options dynamically. */
export function configureClustering(options: Partial<ClusteringOptions>): void {
  getPool().configureClustering(options);
}

/** Get worker specialization information. */
export function getWorkerSpecializations(): Map<number, string> {
  return getPool().getWorkerSpecializations();
}

/** Manually assign worker specialization. */
export function setWorkerSpecialization(workerId: number, specialization: string): void {
  getPool().setWorkerSpecialization(workerId, specialization);
}

/** Destroy the global pool and release resources. */
export function destroyThreaded() {
  if (__pool) {
    __pool.destroy();
    __pool = null;
  }
}
