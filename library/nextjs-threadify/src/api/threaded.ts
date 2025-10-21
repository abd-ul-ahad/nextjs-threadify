// threaded wrapper and decorator

import type { RunOptions } from "../core/types";
import { getPool } from "./pool";

/**
 * Wrap a pure function so it runs on the threaded pool.
 */
export function threaded<T extends (...args: unknown[]) => unknown>(
  fn: T,
  defaults: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const code = fn.toString();
  return (...args: Parameters<T>) => {
    const pool = getPool();
    return pool.run(code, args, defaults);
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
