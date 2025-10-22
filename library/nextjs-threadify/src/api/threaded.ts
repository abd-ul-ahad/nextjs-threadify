// Ultra-fast threaded wrapper and decorator with performance optimizations

import type { RunOptions } from "../core/types";
import { getPool } from "./pool";

// Cache for function code strings to avoid repeated toString() calls
const codeCache = new WeakMap<Function, string>();

/**
 * Ultra-fast threaded function wrapper with intelligent caching.
 * Optimized for maximum performance with minimal overhead.
 */
export function threaded<T extends (...args: unknown[]) => unknown>(
  fn: T,
  defaults: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  // Cache the function code to avoid repeated toString() calls
  let code = codeCache.get(fn);
  if (!code) {
    code = fn.toString();
    codeCache.set(fn, code);
  }

  // Pre-optimize defaults for faster execution
  const optimizedDefaults: RunOptions = {
    priority: 10,
    timeoutMs: 5000,
    minWorkTimeMs: 0.1,
    preferTransferables: true,
    ...defaults,
  };

  // Return optimized function with minimal overhead
  return (...args: Parameters<T>) => {
    const pool = getPool();
    return pool.run(code, args, optimizedDefaults) as Promise<Awaited<ReturnType<T>>>;
  };
}

/**
 * Decorator form to wrap methods or functions to run on the pool.
 */
export function Threaded(defaults: RunOptions = {}): unknown {
  return (target: unknown, context: unknown) => {
    if (
      context &&
      typeof context === 'object' &&
      'kind' in context &&
      (context.kind === "method" ||
        context.kind === "getter" ||
        context.kind === "setter")
    ) {
      const original = target as Function;
      const code = original.toString();
      return function (this: unknown, ...args: unknown[]) {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    if (typeof target === "function") {
      const code = (target as Function).toString();
      return (...args: unknown[]) => {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    return target;
  };
}
