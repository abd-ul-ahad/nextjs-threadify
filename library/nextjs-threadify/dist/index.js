"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var index_exports = {};
__export(index_exports, {
  Threaded: () => Threaded,
  configureThreaded: () => configureThreaded,
  destroyThreaded: () => destroyThreaded,
  getThreadedStats: () => getThreadedStats,
  parallelMap: () => parallelMap,
  threaded: () => threaded,
  useThreaded: () => useThreaded
});
module.exports = __toCommonJS(index_exports);

// src/react/Threadium.tsx
var import_react = require("react");

// src/core/env.ts
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
var hasWorker = isBrowser && typeof Worker !== "undefined";

// src/core/transferables.ts
function isTypedArray(v) {
  return ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer;
}
function collectTransferablesDeep(value, limit = 128) {
  const out = [];
  const stack = [value];
  const seen = /* @__PURE__ */ new Set();
  while (stack.length && out.length < limit) {
    const v = stack.pop();
    if (!v || typeof v !== "object") continue;
    if (seen.has(v)) continue;
    seen.add(v);
    if (v instanceof ArrayBuffer) {
      out.push(v);
      continue;
    }
    if (isTypedArray(v)) {
      out.push(v.buffer);
      continue;
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) stack.push(v[i]);
      continue;
    }
    for (const k in v) {
      try {
        stack.push(v[k]);
      } catch {
      }
    }
  }
  return out;
}

// src/core/worker-blob.ts
function makeWorkerBlobUrl() {
  const workerFn = () => {
    const serializeError = (err) => {
      if (!err) return { message: "Unknown error" };
      return {
        message: err.message || String(err),
        name: err.name || "Error",
        stack: err.stack || ""
      };
    };
    function isTypedArray2(v) {
      return ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer;
    }
    function collectTransferablesDeep2(value, limit = 128) {
      const out = [];
      const stack = [value];
      const seen = /* @__PURE__ */ new Set();
      while (stack.length && out.length < limit) {
        const v = stack.pop();
        if (!v || typeof v !== "object") continue;
        if (seen.has(v)) continue;
        seen.add(v);
        if (v instanceof ArrayBuffer) {
          out.push(v);
          continue;
        }
        if (isTypedArray2(v)) {
          out.push(v.buffer);
          continue;
        }
        if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) stack.push(v[i]);
          continue;
        }
        for (const k in v) {
          try {
            stack.push(v[k]);
          } catch {
          }
        }
      }
      return out;
    }
    const fnCache = /* @__PURE__ */ new Map();
    onmessage = async (e) => {
      const msg = e.data || {};
      const { id, code, args, preferTransferables } = msg;
      if (!id) return;
      try {
        let fn = fnCache.get(code);
        if (!fn) {
          fn = new Function(
            "ARGS",
            `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`
          );
          fnCache.set(code, fn);
        }
        const result = await fn(args);
        if (preferTransferables) {
          const transfers = collectTransferablesDeep2(result);
          postMessage({ id, ok: true, result }, transfers);
        } else {
          postMessage({ id, ok: true, result });
        }
      } catch (err) {
        postMessage({ id, ok: false, error: serializeError(err) });
      }
    };
  };
  const src = `(${workerFn.toString()})();`;
  const blob = new Blob([src], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}

// src/core/id.ts
var __taskCounter = 0;
var nextTaskId = () => ++__taskCounter;

// src/core/worker-pool.ts
var MemoryPool = class {
  constructor(createFn, resetFn, initialSize = 100) {
    this.pool = [];
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  acquire() {
    return this.pool.pop() || this.createFn();
  }
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
};
var LockFreeQueue = class {
  constructor(size) {
    this.head = 0;
    this.tail = 0;
    const actualSize = Math.pow(2, Math.ceil(Math.log2(size)));
    this.buffer = new Array(actualSize);
    this.mask = actualSize - 1;
  }
  enqueue(item) {
    const nextTail = this.tail + 1 & this.mask;
    if (nextTail === this.head) return false;
    this.buffer[this.tail] = item;
    this.tail = nextTail;
    return true;
  }
  dequeue() {
    if (this.head === this.tail) return void 0;
    const item = this.buffer[this.head];
    this.buffer[this.head] = void 0;
    this.head = this.head + 1 & this.mask;
    return item;
  }
  isEmpty() {
    return this.head === this.tail;
  }
  size() {
    return this.tail - this.head & this.mask;
  }
};
var WorkerPool = class {
  constructor(opts = {}) {
    this.url = null;
    this.workers = [];
    this.taskMap = /* @__PURE__ */ new Map();
    this.completed = 0;
    this.failed = 0;
    this.latencies = [];
    this.destroyed = false;
    const cores = isBrowser && navigator?.hardwareConcurrency || 4;
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
      timeoutMs: opts.timeoutMs ?? 1e4
    };
    this.queue = new LockFreeQueue(this.opts.maxQueue);
    this.taskPool = new MemoryPool(
      () => ({
        id: 0,
        code: "",
        args: [],
        resolve: () => {
        },
        reject: () => {
        },
        priority: 0,
        timeoutAt: void 0,
        signal: null,
        preferTransferables: false
      }),
      (task) => {
        task.id = 0;
        task.code = "";
        task.args = [];
        task.resolve = () => {
        };
        task.reject = () => {
        };
        task.priority = 0;
        task.timeoutAt = void 0;
        task.signal = null;
        task.preferTransferables = false;
      },
      this.opts.maxQueue
    );
    this.messagePool = new MemoryPool(
      () => ({ id: 0, code: "", args: [], preferTransferables: false }),
      (msg) => {
        msg.id = 0;
        msg.code = "";
        msg.args = [];
        msg.preferTransferables = false;
      },
      this.opts.maxQueue
    );
    if (hasWorker) {
      this.url = makeWorkerBlobUrl();
      for (let i = 0; i < this.opts.poolSize; i++) {
        const w = new Worker(this.url);
        const slot = { id: i, w, busy: false };
        w.onmessage = (e) => this.handleWorkerMessage(slot, e);
        w.onerror = () => {
        };
        this.workers.push(slot);
      }
      if (this.opts.warmup) this.warmup();
    }
  }
  /** Get current pool statistics with ultra-fast calculations */
  getStats() {
    const avgLatency = this.latencies.length ? Math.round(
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
    ) : 0;
    return {
      name: this.opts.name,
      poolSize: this.opts.poolSize,
      busy: this.workers.filter((w) => w.busy).length,
      idle: this.workers.filter((w) => !w.busy).length,
      inFlight: this.taskMap.size,
      queued: this.queue.size(),
      // Use lock-free queue size
      completed: this.completed,
      failed: this.failed,
      avgLatencyMs: avgLatency
    };
  }
  /** Ultra-fast task execution with memory pooling */
  run(code, args, options = {}) {
    if (this.destroyed) {
      return Promise.reject(new Error("Pool has been destroyed"));
    }
    const task = this.taskPool.acquire();
    task.id = nextTaskId();
    task.code = code;
    task.args = args;
    task.priority = options.priority ?? 0;
    task.timeoutAt = options.timeoutMs ? Date.now() + options.timeoutMs : void 0;
    task.signal = options.signal ?? null;
    task.preferTransferables = options.preferTransferables ?? this.opts.preferTransferables;
    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      this.taskMap.set(task.id, {
        createdAt: Date.now(),
        resolve,
        reject
      });
      if (task.timeoutAt) {
        const timeout = setTimeout(() => {
          this.taskMap.delete(task.id);
          reject(new Error(`Task ${task.id} timed out`));
        }, options.timeoutMs);
        const originalResolve = task.resolve;
        task.resolve = (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        };
      }
      if (task.signal?.aborted) {
        this.taskMap.delete(task.id);
        reject(new Error(`Task ${task.id} was aborted`));
        return;
      }
      if (task.signal) {
        const abortHandler = () => {
          this.taskMap.delete(task.id);
          reject(new Error(`Task ${task.id} was aborted`));
        };
        task.signal.addEventListener("abort", abortHandler, { once: true });
      }
      this.enqueueTask(task);
    });
  }
  /** Ultra-fast task enqueueing with lock-free queue */
  enqueueTask(task) {
    if (this.opts.strategy === "inline") {
      this.runInline(task);
      return;
    }
    if (!this.queue.enqueue(task)) {
      if (this.opts.saturation === "reject") {
        this.taskPool.release(task);
        task.reject(new Error("Queue is full"));
        return;
      } else if (this.opts.saturation === "inline") {
        this.runInline(task);
        return;
      }
    }
    this.processQueue();
  }
  /** Ultra-fast queue processing with lock-free operations */
  processQueue() {
    while (!this.queue.isEmpty()) {
      const worker = this.findAvailableWorker();
      if (!worker) break;
      const task = this.queue.dequeue();
      if (!task) break;
      this.assignTaskToWorker(worker, task);
    }
  }
  /** Find an available worker */
  findAvailableWorker() {
    return this.workers.find((w) => !w.busy) || null;
  }
  /** Ultra-fast worker assignment with memory pooling */
  assignTaskToWorker(worker, task) {
    worker.busy = true;
    const message = this.messagePool.acquire();
    message.id = task.id;
    message.code = task.code;
    message.args = task.args;
    message.preferTransferables = task.preferTransferables;
    const transferables = task.preferTransferables ? collectTransferablesDeep(task.args) : [];
    if (transferables.length > 0) {
      worker.w.postMessage(message, transferables);
    } else {
      worker.w.postMessage(message);
    }
    this.messagePool.release(message);
  }
  /** Run task inline on main thread */
  runInline(task) {
    try {
      const fn = new Function("return " + task.code)();
      const result = fn(...task.args);
      if (result instanceof Promise) {
        result.then(task.resolve).catch(task.reject);
      } else {
        task.resolve(result);
      }
    } catch (error) {
      task.reject(error);
    }
  }
  /** Ultra-fast worker message handling with memory pool management */
  handleWorkerMessage(worker, e) {
    const { id, result, error } = e.data;
    const taskInfo = this.taskMap.get(id);
    if (!taskInfo) return;
    this.taskMap.delete(id);
    worker.busy = false;
    const latency = Date.now() - taskInfo.createdAt;
    this.latencies.push(latency);
    if (this.latencies.length > 100) {
      this.latencies[this.latencies.length % 100] = latency;
    }
    if (error) {
      this.failed++;
      taskInfo.reject(new Error(error));
    } else {
      this.completed++;
      taskInfo.resolve(result);
    }
    this.processQueue();
  }
  /** Warm up workers */
  warmup() {
    const warmupCode = "() => 0";
    const promises = this.workers.map((worker) => {
      return new Promise((resolve) => {
        const originalOnMessage = worker.w.onmessage;
        worker.w.onmessage = () => {
          worker.w.onmessage = originalOnMessage;
          resolve();
        };
        worker.w.postMessage({
          id: -1,
          code: warmupCode,
          args: [],
          preferTransferables: false
        });
      });
    });
    Promise.all(promises).catch(() => {
    });
  }
  /** Destroy the pool and clean up all resources */
  destroy() {
    this.destroyed = true;
    while (!this.queue.isEmpty()) {
      const task = this.queue.dequeue();
      if (task) {
        this.taskPool.release(task);
      }
    }
    this.taskMap.clear();
    for (const worker of this.workers) {
      worker.w.terminate();
    }
    this.workers.length = 0;
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
};

// src/api/pool.ts
var __pool = null;
var __poolOpts = null;
function configureThreaded(opts = {}) {
  __poolOpts = { ...__poolOpts || {}, ...opts };
  if (__pool && isBrowser) {
    __pool.destroy();
    __pool = null;
  }
}
function getPool() {
  if (!isBrowser || !hasWorker) {
    return new WorkerPool({
      ...__poolOpts || {},
      poolSize: 0,
      strategy: "inline",
      warmup: false
    });
  }
  if (!__pool) {
    __pool = new WorkerPool(__poolOpts || {});
  }
  return __pool;
}
function getThreadedStats() {
  const pool = getPool();
  return pool.getStats();
}
function destroyThreaded() {
  if (__pool) {
    __pool.destroy();
    __pool = null;
  }
}

// src/api/threaded.ts
var codeCache = /* @__PURE__ */ new WeakMap();
function threaded(fn, defaults = {}) {
  let code = codeCache.get(fn);
  if (!code) {
    code = fn.toString();
    codeCache.set(fn, code);
  }
  const optimizedDefaults = {
    priority: 10,
    timeoutMs: 5e3,
    minWorkTimeMs: 0.1,
    preferTransferables: true,
    ...defaults
  };
  return (...args) => {
    const pool = getPool();
    return pool.run(code, args, optimizedDefaults);
  };
}
function Threaded(defaults = {}) {
  return (target, context) => {
    if (context && typeof context === "object" && "kind" in context && (context.kind === "method" || context.kind === "getter" || context.kind === "setter")) {
      const original = target;
      const code = original.toString();
      return function(...args) {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    if (typeof target === "function") {
      const code = target.toString();
      return (...args) => {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    return target;
  };
}

// src/react/Threadium.tsx
function useThreaded(fn, deps = []) {
  const threadedFn = (0, import_react.useMemo)(() => {
    return threaded(fn, {
      priority: 50,
      // High priority for fastest execution
      timeoutMs: 5e3,
      minWorkTimeMs: 0.1,
      preferTransferables: true
      // Enable zero-copy transfers
    });
  }, deps);
  return (0, import_react.useCallback)(
    (...args) => {
      return threadedFn(...args);
    },
    [threadedFn]
  );
}

// src/api/parallel.ts
async function parallelMap(items, mapper, options = {}) {
  const pool = getPool();
  const code = mapper.toString();
  const chunkSize = Math.max(
    1,
    options.chunkSize ?? Math.ceil(items.length / Math.max(1, pool.getStats().poolSize))
  );
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize)
    chunks.push({ start: i, end: Math.min(items.length, i + chunkSize) });
  const out = new Array(items.length);
  await Promise.all(
    chunks.map(({ start, end }) => {
      const slice = items.slice(start, end).map((v, i) => [v, start + i]);
      const chunkRunner = (pairs) => {
        const mapperFn = (0, eval)(`(${code})`);
        return pairs.map(([v, idx]) => mapperFn(v, idx, []));
      };
      return pool.run(chunkRunner.toString(), [slice], options).then((results) => {
        const typedResults = results;
        for (let i = 0; i < typedResults.length; i++) out[start + i] = typedResults[i];
      });
    })
  );
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Threaded,
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
  parallelMap,
  threaded,
  useThreaded
});
