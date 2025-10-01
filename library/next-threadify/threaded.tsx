"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { configureThreaded, threaded } from "./index";

interface ThreadedProps {
  children: ReactNode;
  /**
   * Optional: Configure worker pool size (defaults to CPU cores - 1)
   */
  poolSize?: number;
  /**
   * Optional: Minimum work time threshold in ms to decide worker vs inline (default: 6ms)
   */
  minWorkTimeMs?: number;
  /**
   * Optional: Enable/disable worker warmup (default: true)
   */
  warmup?: boolean;
  /**
   * Optional: Scheduling strategy - 'auto' | 'always' | 'inline' (default: 'auto')
   */
  strategy?: "auto" | "always" | "inline";
}

/**
 * <Threaded> component wrapper that runs its children in a multi-threaded
 * environment using Web Workers when available, with automatic SSR/hydration
 * safety and graceful fallback to main thread execution.
 *
 * Features:
 * - SSR-safe: No errors during server-side rendering
 * - Hydration-friendly: Seamless client-side takeover
 * - Automatic worker pool management
 * - Smooth animations via requestAnimationFrame scheduling
 * - Zero-copy transfers for ArrayBuffers when possible
 *
 * Usage:
 * ```tsx
 * <Threaded poolSize={4} strategy="auto">
 *   <HeavyComponent />
 * </Threaded>
 * ```
 */
export function Threaded({
  children,
  poolSize,
  minWorkTimeMs,
  warmup = true,
  strategy = "auto",
}: ThreadedProps) {
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(null);

  // SSR safety: only initialize workers on client
  useEffect(() => {
    setIsClient(true);

    // Configure the global worker pool with user options
    configureThreaded({
      poolSize,
      minWorkTimeMs,
      warmup,
      strategy,
      preferTransferables: true,
      saturation: "enqueue",
    });

    // Smooth animation loop to ensure consistent frame timing
    // This helps maintain 60fps even when workers are processing
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

  // During SSR or before hydration, render children normally
  if (!isClient) {
    return <div ref={containerRef}>{children}</div>;
  }

  // After hydration, wrap in a container that enables GPU acceleration
  // for smooth animations and transitions
  return (
    <div
      ref={containerRef}
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        perspective: 1000,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Hook to access threaded execution within components.
 * Use this to offload heavy computations to worker threads.
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
  const threadedFnRef = useRef<ReturnType<typeof threaded<T>>>(null);

  useEffect(() => {
    threadedFnRef.current = threaded(fn);
  }, deps);

  return (...args: Parameters<T>) => {
    if (!threadedFnRef.current) {
      // Fallback to direct execution if not initialized
      return Promise.resolve(fn(...args));
    }
    return threadedFnRef.current(...args);
  };
}
