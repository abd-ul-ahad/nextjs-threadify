"use client";

import { useState } from "react";
import { threaded, getThreadedStats } from "@/library/next-threadify";
import { Threadium } from "@/library/next-threadify/index";

// Heavy computation component to demonstrate threading
function HeavyAnimation() {
  const [count, setCount] = useState<number>(0);
  const [result, setResult] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);

  // Use threaded hook to offload heavy computation
  const heavyCompute = threaded((n: number) => {
    // Simulate heavy computation (Fibonacci)
    function fib(x: number): number {
      if (x <= 1) return x;
      return fib(x - 1) + fib(x - 2);
    }
    return fib(n);
  });

  const handleCompute = async () => {
    setComputing(true);
    try {
      const res = await heavyCompute(40); // Heavy computation
      setResult(res);
    } catch (err) {
      console.error("Computation failed:", err);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="w-full">
      <div>
        <div>Heavy Computation Demo</div>
        <div>
          This component runs expensive calculations in a worker thread, keeping
          the UI smooth
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setCount(count + 1)}>
            Increment: {count}
          </button>
          <button onClick={handleCompute} disabled={computing}>
            {computing ? "Computing..." : "Run Heavy Task (Fib 40)"}
          </button>
        </div>
        {result !== null && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">
              Result: {result.toLocaleString()}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Try clicking "Increment" while the heavy task is running. The UI
            stays responsive because the computation runs in a worker thread!
          </p>
        </div>
      </div>
    </div>
  );
}

// Smooth animation component
function SmoothAnimation() {
  const [rotation, setRotation] = useState(0);

  return (
    <div className="w-full">
      <div>
        <div>Smooth Animation</div>
        <div>This animation remains fluid even during heavy computations</div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-32 w-32 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.5s ease-out",
          }}
        />
        <button onClick={() => setRotation((r) => r + 45)}>Rotate 45°</button>
      </div>
    </div>
  );
}

// Stats display component
function ThreadedStats() {
  const [stats, setStats] = useState<ReturnType<
    typeof getThreadedStats
  > | null>(null);

  const updateStats = () => {
    try {
      setStats(getThreadedStats());
    } catch (err) {
      console.error("Failed to get stats:", err);
    }
  };

  return (
    <div className="w-full">
      <div>
        <div>Worker Pool Statistics</div>
        <div>Real-time metrics from the thread pool</div>
      </div>
      <div className="space-y-4">
        <button onClick={updateStats}>Refresh Stats</button>
        {stats && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Pool Size:</p>
              <p className="text-muted-foreground">{stats.poolSize}</p>
            </div>
            <div>
              <p className="font-medium">Busy Workers:</p>
              <p className="text-muted-foreground">{stats.busy}</p>
            </div>
            <div>
              <p className="font-medium">Idle Workers:</p>
              <p className="text-muted-foreground">{stats.idle}</p>
            </div>
            <div>
              <p className="font-medium">Queued Tasks:</p>
              <p className="text-muted-foreground">{stats.queued}</p>
            </div>
            <div>
              <p className="font-medium">Completed:</p>
              <p className="text-muted-foreground">{stats.completed}</p>
            </div>
            <div>
              <p className="font-medium">Failed:</p>
              <p className="text-muted-foreground">{stats.failed}</p>
            </div>
            <div className="col-span-2">
              <p className="font-medium">Avg Latency:</p>
              <p className="text-muted-foreground">{stats.avgLatencyMs}ms</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Threaded Component Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Multi-threaded React components with SSR support and smooth
            animations
          </p>
        </div>

        <Threadium>
          <div className="grid gap-6 md:grid-cols-2">
            <HeavyAnimation />
            <SmoothAnimation />
          </div>
        </Threadium>

        <ThreadedStats />

        <div>
          <div>
            <div>How It Works</div>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                &lt;Threaded&gt;
              </code>{" "}
              component wraps your heavy components and automatically manages a
              Web Worker pool for offloading computations.
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>
                <strong>SSR-Safe:</strong> No errors during server-side
                rendering
              </li>
              <li>
                <strong>Hydration-Friendly:</strong> Seamless client-side
                takeover
              </li>
              <li>
                <strong>Auto Worker Pool:</strong> Configures based on CPU cores
              </li>
              <li>
                <strong>Smooth Animations:</strong> GPU acceleration hints for
                60fps
              </li>
              <li>
                <strong>Zero-Copy Transfers:</strong> Efficient ArrayBuffer
                handling
              </li>
            </ul>
            <p>
              Use the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                useThreaded
              </code>{" "}
              hook to offload heavy computations to worker threads while keeping
              your UI responsive.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
