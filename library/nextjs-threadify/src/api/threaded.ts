// threaded wrapper and decorator

import type { RunOptions } from "../core/types";
import { getPool } from "./pool";

/**
 * Wrap a pure function so it runs on the threaded pool.
 */
export function threaded<T extends (...args: any[]) => any>(
  fn: T,
  defaults: RunOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const code = fn.toString();
  return (...args: any[]) => {
    const pool = getPool();
    return pool.run(code, args, defaults);
  };
}

/**
 * Decorator form to wrap methods or functions to run on the pool.
 */
export function Threaded(defaults: RunOptions = {}): any {
  return (target: any, context: any) => {
    if (
      context &&
      (context.kind === "method" ||
        context.kind === "getter" ||
        context.kind === "setter")
    ) {
      const original = target;
      const code = original.toString();
      return function (this: any, ...args: any[]) {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    if (typeof target === "function") {
      const code = target.toString();
      return (...args: any[]) => {
        const pool = getPool();
        return pool.run(code, args, defaults);
      };
    }
    return target;
  };
}
