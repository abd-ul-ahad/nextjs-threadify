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
  Threadium: () => Threadium,
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
      return typeof v === "object" && v && ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer;
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
var WorkerPool = class {
  constructor(opts = {}) {
    this.url = null;
    this.workers = [];
    this.queue = [];
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
  warmup() {
    const tiny = () => 1 + 1;
    const code = tiny.toString();
    for (const slot of this.workers) {
      try {
        slot.w.postMessage({
          id: -1,
          code,
          args: [],
          preferTransferables: false
        });
      } catch {
      }
    }
  }
  destroy() {
    if (this.destroyed) return;
    for (const slot of this.workers) {
      try {
        slot.w.terminate();
      } catch {
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
  getStats() {
    const busy = this.workers.filter((w) => w.busy).length;
    const avg = this.latencies.length ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 0;
    return {
      name: this.opts.name,
      poolSize: this.workers.length,
      busy,
      idle: this.workers.length - busy,
      inFlight: busy,
      queued: this.queue.length,
      completed: this.completed,
      failed: this.failed,
      avgLatencyMs: Math.round(avg)
    };
  }
  handleWorkerMessage(slot, e) {
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
    if (this.latencies.length > 1e3) this.latencies.shift();
    if (ok) {
      this.completed++;
      rec.resolve(result);
    } else {
      this.failed++;
      rec.reject(error);
    }
    this.pump();
  }
  pickFreeWorker() {
    for (const slot of this.workers) if (!slot.busy) return slot;
    return null;
  }
  schedule(task) {
    let i = this.queue.length - 1;
    while (i >= 0 && this.queue[i].priority < task.priority) i--;
    this.queue.splice(i + 1, 0, task);
    this.pump();
  }
  pump() {
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
        reject: task.reject
      });
      if (task.timeoutAt) {
        const rem = Math.max(0, task.timeoutAt - performance.now());
        setTimeout(() => {
          if (this.taskMap.has(id)) {
            this.taskMap.get(id)?.reject(
              Object.assign(new Error("Timeout"), { name: "TimeoutError" })
            );
            this.taskMap.delete(id);
          }
        }, rem);
      }
      try {
        const transfers = preferTransferables ? collectTransferablesDeep(args) : [];
        slot.w.postMessage({ id, code, args, preferTransferables }, transfers);
      } catch (err) {
        slot.busy = false;
        this.taskMap.delete(id);
        task.reject(err);
      }
    }
  }
  async runInline(code, args) {
    const fn = new Function(
      "ARGS",
      `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`
    );
    return fn(args);
  }
  run(code, args, options = {}) {
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
            name: "SaturationError"
          })
        );
      } else if (policy === "inline") {
        return this.runInline(code, args);
      }
    }
    const preferTransferables = options.preferTransferables ?? this.opts.preferTransferables;
    if (options.signal?.aborted) {
      return Promise.reject(
        Object.assign(new Error("Aborted"), { name: "AbortError" })
      );
    }
    return new Promise((resolve, reject) => {
      const t = {
        id,
        code,
        args,
        resolve,
        reject,
        priority: options.priority ?? 0,
        timeoutAt: options.timeoutMs ?? this.opts.timeoutMs ? performance.now() + (options.timeoutMs ?? this.opts.timeoutMs) : void 0,
        signal: options.signal ?? null,
        preferTransferables
      };
      if (t.signal) {
        const listener = () => {
          const idx = this.queue.findIndex((q) => q.id === t.id);
          if (idx >= 0) {
            this.queue.splice(idx, 1);
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          }
          try {
            t.signal?.removeEventListener("abort", listener);
          } catch {
          }
        };
        t.signal.addEventListener("abort", listener, { once: true });
      }
      this.schedule(t);
    });
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
  return getPool().getStats();
}
function destroyThreaded() {
  if (__pool) {
    __pool.destroy();
    __pool = null;
  }
}

// src/api/threaded.ts
function threaded(fn, defaults = {}) {
  const code = fn.toString();
  return (...args) => {
    const pool = getPool();
    return pool.run(code, args, defaults);
  };
}
function Threaded(defaults = {}) {
  return (target, context) => {
    if (context && (context.kind === "method" || context.kind === "getter" || context.kind === "setter")) {
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
var import_jsx_runtime = require("react/jsx-runtime");
function Threadium({
  children,
  poolSize,
  minWorkTimeMs,
  warmup = true,
  strategy = "auto",
  className
}) {
  const [isClient, setIsClient] = (0, import_react.useState)(false);
  const containerRef = (0, import_react.useRef)(null);
  const rafRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    setIsClient(true);
    configureThreaded({
      poolSize,
      minWorkTimeMs,
      warmup,
      strategy,
      preferTransferables: true,
      saturation: "enqueue"
    });
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [poolSize, minWorkTimeMs, warmup, strategy]);
  if (!isClient) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className, ref: containerRef, children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      ref: containerRef,
      className,
      style: {
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        perspective: 1e3
      },
      children
    }
  );
}
function useThreaded(fn, deps = []) {
  const threadedFnRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    threadedFnRef.current = threaded(fn);
  }, deps);
  return (...args) => {
    if (!threadedFnRef.current) {
      return Promise.resolve(fn(...args));
    }
    return threadedFnRef.current(...args);
  };
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
        for (let i = 0; i < results.length; i++) out[start + i] = results[i];
      });
    })
  );
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Threaded,
  Threadium,
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
  parallelMap,
  threaded,
  useThreaded
});
