"use client";

import { useCallback, useMemo } from "react";
import { threaded } from "../api/threaded";

/**
 * Ultra-fast threaded execution hook with minimal overhead.
 * Optimized for maximum performance with intelligent caching and lazy initialization.
 *
 * Example:
 * ```tsx
 * const processData = useThreaded((data: number[]) => {
 *   return data.map(x => x * 2).reduce((a, b) => a + b, 0)
 * })
 *
 * const result = await processData([1, 2, 3, 4, 5])
 * ```
 */
export function useThreaded<T extends (...args: any[]) => any>(
  fn: T,
  deps: any[] = []
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  // Memoize the threaded function to avoid recreation on every render
  const threadedFn = useMemo(() => {
    return threaded(fn, {
      priority: 50, // High priority for fastest execution
      timeoutMs: 5000,
      minWorkTimeMs: 0.1,
      preferTransferables: true, // Enable zero-copy transfers
    });
  }, deps);

  // Use useCallback to prevent unnecessary re-renders of components using this hook
  return useCallback(
    (...args: Parameters<T>) => {
      return threadedFn(...args);
    },
    [threadedFn]
  );
}
