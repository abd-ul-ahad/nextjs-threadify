/* eslint-disable @typescript-eslint/no-explicit-any */

// WorkerPool implementation split out from the monolith, functionally identical

import { hasWorker, isBrowser } from "./env";
import { collectTransferablesDeep } from "./transferables";
import { makeWorkerBlobUrl } from "./worker-blob";
import { nextTaskId } from "./id";
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
    };

    if (hasWorker) {
      this.url = makeWorkerBlobUrl();
      for (let i = 0; i < this.opts.poolSize; i++) {
        const w = new Worker(this.url);
        const slot: WorkerSlot = { id: i, w, busy: false };
        w.onmessage = (e: MessageEvent) => this.handleWorkerMessage(slot, e);
        w.onerror = () => {
          // keep pool running on worker error
        };
        this.workers.push(slot);
      }
      if (this.opts.warmup) this.warmup();
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
      } catch {}
    }
  }

  destroy() {
    if (this.destroyed) return;
    for (const slot of this.workers) {
      try {
        slot.w.terminate();
      } catch {}
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

  private handleWorkerMessage(slot: WorkerSlot, e: MessageEvent) {
    slot.busy = false;
    const msg = e.data || {};
    const { id, ok, result, error } = msg;
    const rec = this.taskMap.get(id);
    if (!rec) {
      this.pump();
      return;
    }
    this.taskMap.delete(id);
    const latency = performance.now() - rec.createdAt;
    this.latencies.push(latency);
    if (this.latencies.length > 1000) this.latencies.shift();

    if (ok) {
      this.completed++;
      rec.resolve(result);
    } else {
      this.failed++;
      rec.reject(error);
    }
    this.pump();
  }

  private pickFreeWorker(): WorkerSlot | null {
    for (const slot of this.workers) if (!slot.busy) return slot;
    return null;
  }

  private schedule(task: Task) {
    let i = this.queue.length - 1;
    while (i >= 0 && this.queue[i].priority < task.priority) i--;
    this.queue.splice(i + 1, 0, task);
    this.pump();
  }

  private pump() {
    if (!hasWorker) return;
    while (true) {
      const slot = this.pickFreeWorker();
      if (!slot) break;
      const task = this.queue.shift();
      if (!task) break;

      if (task.signal?.aborted) {
        task.reject(
          Object.assign(new Error("Aborted"), { name: "AbortError" })
        );
        continue;
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
            this.taskMap
              .get(id)
              ?.reject(
                Object.assign(new Error("Timeout"), { name: "TimeoutError" })
              );
            this.taskMap.delete(id);
          }
        }, rem);
      }

      try {
        const transfers = preferTransferables
          ? collectTransferablesDeep(args)
          : [];
        slot.w.postMessage({ id, code, args, preferTransferables }, transfers);
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
            ? performance.now() + (options.timeoutMs ?? this.opts.timeoutMs)!
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
          } catch {}
        };
        t.signal.addEventListener("abort", listener, { once: true });
      }

      this.schedule(t);
    });
  }
}
