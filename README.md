# nextjs-threadify

A lightweight, high-performance worker pool library for browsers that enables you to run CPU-intensive tasks on background threads with zero configuration. Perfect for React/Next.js applications that need to perform heavy computations without blocking the UI.

## Features

-  **Zero Configuration** - Works out of the box with sensible defaults
-  **Web Workers Pool** - Efficiently manages multiple worker threads
-  **Transferable Objects** - Automatic zero-copy ArrayBuffer transfers
-  **Smart Scheduling** - Auto-detects heavy vs light tasks
-  **Graceful Fallback** - Runs inline when workers aren't available
-  **Performance Monitoring** - Built-in diagnostics and statistics
-  **Cancellation Support** - Full AbortSignal integration
-  **TypeScript First** - Complete type safety and IntelliSense

## Installation

```bash
# npm
npm install nextjs-threadify

# yarn
yarn add nextjs-threadify

# pnpm
pnpm add nextjs-threadify
```

## Quick Start

```typescript
import { threaded } from "nextjs-threadify";

// Wrap any CPU-intensive function
const heavyComputation = threaded((numbers: number[]) => {
  return numbers.reduce((sum, n) => sum + Math.sqrt(n * n + 1), 0);
});

// Use it - runs on background thread automatically
const result = await heavyComputation([1, 2, 3, 4, 5]);
console.log("Result:", result);
```

That's it! No configuration needed. The function automatically runs on a worker thread pool.

## Usage

### Basic Usage

```typescript
import { threaded } from "nextjs-threadify";

// Any pure function can be made threaded
const fibonacci = threaded((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

// Automatically runs on worker thread
const result = await fibonacci(40);
```

### React/Next.js Integration

```tsx
import { threaded, parallelMap } from "nextjs-threadify";
import { useState } from "react";

// Heavy image processing function
const processImage = threaded((imageData: Uint8Array) => {
  const processed = new Uint8Array(imageData.length);
  for (let i = 0; i < imageData.length; i += 4) {
    processed[i] = Math.min(255, imageData[i] * 1.2); // R
    processed[i + 1] = Math.min(255, imageData[i + 1] * 1.1); // G
    processed[i + 2] = Math.min(255, imageData[i + 2] * 0.9); // B
    processed[i + 3] = imageData[i + 3]; // A
  }
  return processed;
});

function ImageProcessor() {
  const [processing, setProcessing] = useState(false);

  const handleImageUpload = async (file: File) => {
    setProcessing(true);

    const arrayBuffer = await file.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    // Runs on worker thread - UI stays responsive!
    const processed = await processImage(imageData);

    setProcessing(false);
    // Use processed image data...
  };

  return (
    <input
      type="file"
      onChange={(e) =>
        e.target.files?.[0] && handleImageUpload(e.target.files[0])
      }
      disabled={processing}
    />
  );
}
```

## Configuration Types

### ThreadedOptions

Configuration options for the worker pool:

```typescript
type ThreadedOptions = {
  poolSize?: number; // Number of workers (default: hardwareConcurrency - 1, capped at 4)
  maxQueue?: number; // Max queued tasks before saturation (default: 256)
  warmup?: boolean; // Warmup workers with tiny jobs (default: true)
  strategy?: Strategy; // Scheduling strategy (default: "auto")
  minWorkTimeMs?: number; // Min work time for auto strategy (default: 6ms)
  saturation?: SaturationPolicy; // Behavior when queue is full (default: "enqueue")
  preferTransferables?: boolean; // Try to transfer ArrayBuffers (default: true)
  name?: string; // Pool name for diagnostics
  timeoutMs?: number; // Default task timeout (default: 10000ms)
};
```

**Strategy Options:**

- `"auto"` - Automatically choose worker for heavy tasks, inline for light tasks
- `"always"` - Always use workers when available
- `"inline"` - Always run on main thread

**Saturation Policy Options:**

- `"reject"` - Reject new tasks when queue is full
- `"inline"` - Run new tasks inline when queue is full
- `"enqueue"` - Queue tasks even when at capacity

### RunOptions

Per-task options that override pool defaults:

```typescript
type RunOptions = {
  signal?: AbortSignal | null; // Cancellation support
  timeoutMs?: number; // Per-task timeout
  priority?: number; // Task priority (higher numbers first)
  preferTransferables?: boolean; // Override pool transferable preference
  strategy?: Strategy; // Override pool strategy
  minWorkTimeMs?: number; // Override min work time heuristic
};
```

## API Reference

### threaded(fn, defaults?)

Converts any pure function into a threaded version that runs on worker threads.

```typescript
import { threaded } from "nextjs-threadify";

const threadedFunction = threaded(
  (param1: Type1, param2: Type2) => {
    // Your computation here
    return result;
  },
  {
    priority: 1, // Optional: task priority
    timeoutMs: 5000, // Optional: task timeout
  }
);

// Returns Promise<ResultType>
const result = await threadedFunction(arg1, arg2);
```

**Important:** Functions must be self-contained (no external variables).

### Threaded(defaults?) - Decorator

Use as a decorator for class methods or to wrap functions.

```typescript
import { Threaded } from "nextjs-threadify";

class DataProcessor {
  @Threaded({ priority: 5 })
  async processLargeDataset(data: number[]): Promise<number[]> {
    return data.map((x) => Math.sqrt(x * x + 1));
  }
}

// Or wrap functions directly
const wrappedFunction = Threaded({ timeoutMs: 3000 })((data: string) => {
  return data.split("").reverse().join("");
});
```

### parallelMap(items, mapper, options?)

Process arrays in parallel across multiple worker threads.

```typescript
import { parallelMap } from "nextjs-threadify";

const numbers = Array.from({ length: 10000 }, (_, i) => i);

const results = await parallelMap(
  numbers,
  (num, index) => {
    // This runs in parallel across workers
    return Math.sqrt(num) + Math.sin(num);
  },
  {
    chunkSize: 100, // Items per worker chunk
    priority: 1, // Task priority
  }
);

console.log(`Processed ${results.length} items in parallel`);
```

### configureThreaded(opts)

Configure the global worker pool settings.

```typescript
import { configureThreaded } from "nextjs-threadify";

configureThreaded({
  poolSize: 8, // Number of worker threads
  strategy: "auto", // 'auto' | 'always' | 'inline'
  timeoutMs: 10000, // Default timeout per task
  preferTransferables: true, // Use transferable objects
  name: "my-app-pool", // Pool name for debugging
});
```

### getThreadedStats()

Get real-time statistics about your worker pool performance.

```typescript
import { getThreadedStats } from "nextjs-threadify";

const stats = getThreadedStats();
console.log({
  poolSize: stats.poolSize, // Total workers
  busy: stats.busy, // Currently working
  queued: stats.queued, // Tasks waiting
  completed: stats.completed, // Total completed
  avgLatencyMs: stats.avgLatencyMs, // Average response time
});
```

### destroyThreaded()

Clean up worker pool resources (call when your app shuts down).

```typescript
import { destroyThreaded } from "nextjs-threadify";

// In Next.js, you might call this in cleanup
useEffect(() => {
  return () => {
    destroyThreaded();
  };
}, []);
```

## Common Use Cases

### Data Processing

```typescript
import { threaded, parallelMap } from "nextjs-threadify";

// Process CSV data
const processCSV = threaded((csvString: string) => {
  return csvString.split("\n").map((row) => {
    const cells = row.split(",");
    return {
      name: cells[0],
      value: parseFloat(cells[1]) * 1.1,
      processed: new Date().toISOString(),
    };
  });
});

// Bulk data transformation
const transformData = async (records: any[]) => {
  return await parallelMap(records, (record) => {
    // Heavy transformation per record
    return {
      ...record,
      computed: heavyCalculation(record.value),
      normalized: record.value / 100,
    };
  });
};
```

### Image/Media Processing

```typescript
import { threaded } from "nextjs-threadify";

const resizeImage = threaded(
  (imageData: Uint8Array, width: number, height: number) => {
    // Implement image resizing algorithm
    const resized = new Uint8Array(width * height * 4);
    // ... resizing logic
    return resized;
  }
);

const applyFilter = threaded((pixels: Uint8Array, filterType: string) => {
  const filtered = new Uint8Array(pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    switch (filterType) {
      case "sepia":
        // Apply sepia effect
        break;
      case "blur":
        // Apply blur effect
        break;
    }
  }

  return filtered;
});
```

### Mathematical Computations

```typescript
import { parallelMap } from "nextjs-threadify";

// Monte Carlo simulation
const runSimulation = async (iterations: number) => {
  const chunks = Array.from({ length: 100 }, (_, i) => iterations / 100);

  const results = await parallelMap(chunks, (chunkSize) => {
    let hits = 0;
    for (let i = 0; i < chunkSize; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      if (x * x + y * y <= 1) hits++;
    }
    return hits;
  });

  const totalHits = results.reduce((sum, hits) => sum + hits, 0);
  return (totalHits / iterations) * 4; // Estimate of π
};

const piEstimate = await runSimulation(10000000);
```

## Error Handling

```typescript
import { threaded } from "nextjs-threadify";

const riskyOperation = threaded((data: number[]) => {
  if (data.length === 0) {
    throw new Error("Empty array not allowed");
  }
  return data.reduce((sum, n) => sum + n, 0);
});

try {
  const result = await riskyOperation([1, 2, 3]);
  console.log("Success:", result);
} catch (error) {
  console.error("Task failed:", error.message);

  // Handle specific error types
  if (error.name === "TimeoutError") {
    console.log("Task timed out");
  } else if (error.name === "AbortError") {
    console.log("Task was cancelled");
  }
}
```

## Cancellation

```typescript
import { threaded } from "nextjs-threadify";

const longRunningTask = threaded((iterations: number) => {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.random();
  }
  return result;
});

// Create abort controller
const controller = new AbortController();

// Start task with cancellation support
const taskPromise = longRunningTask(10000000);

// Cancel after 2 seconds
setTimeout(() => {
  controller.abort();
}, 2000);

try {
  const result = await taskPromise;
  console.log("Completed:", result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Task was cancelled by user");
  }
}
```

## Performance Monitoring

```typescript
import { getThreadedStats } from "nextjs-threadify";

// Monitor performance in real-time
setInterval(() => {
  const stats = getThreadedStats();

  console.log(`
    Pool Status:
    - Workers: ${stats.busy}/${stats.poolSize} busy
    - Queue: ${stats.queued} pending
    - Completed: ${stats.completed} tasks
    - Average latency: ${stats.avgLatencyMs}ms
  `);

  // Alert if performance is degrading
  if (stats.avgLatencyMs > 100) {
    console.warn("High latency detected!");
  }

  if (stats.queued > 50) {
    console.warn("Queue is getting backed up!");
  }
}, 5000);
```

## Configuration Options

### ThreadedOptions

```typescript
type ThreadedOptions = {
  poolSize?: number; // Number of workers (default: CPU cores - 1)
  maxQueue?: number; // Max queued tasks (default: 256)
  warmup?: boolean; // Warmup workers on start (default: true)
  strategy?: "auto" | "always" | "inline"; // When to use workers
  minWorkTimeMs?: number; // Min time for worker vs inline (default: 6ms)
  saturation?: "reject" | "inline" | "enqueue"; // Queue full behavior
  preferTransferables?: boolean; // Use zero-copy transfers (default: true)
  name?: string; // Pool name for debugging
  timeoutMs?: number; // Default task timeout (default: 10000ms)
};
```

### RunOptions

```typescript
type RunOptions = {
  signal?: AbortSignal; // Cancellation support
  timeoutMs?: number; // Task-specific timeout
  priority?: number; // Higher number = higher priority
  preferTransferables?: boolean; // Override pool setting
  strategy?: "auto" | "always" | "inline"; // Override pool strategy
  minWorkTimeMs?: number; // Override work time threshold
};
```

## Important Rules

### Function Requirements

✅ **Good - Self-contained functions:**

```typescript
const good = threaded((x: number, multiplier: number) => {
  const helper = (n: number) => n * 2; // Local functions OK
  return helper(x) * multiplier; // Parameters OK
});

await good(5, 10); // Pass values as parameters
```

❌ **Bad - External dependencies:**

```typescript
const external = 10; // External variable

const bad = threaded((x: number) => {
  return x * external; // Won't work - external not available in worker!
});
```

### Performance Guidelines

- **Best for CPU-heavy tasks** (>6ms of computation)
- **Use `parallelMap`** for processing large arrays
- **Enable transferables** for ArrayBuffer/TypedArray data
- **Monitor with `getThreadedStats()`** to optimize performance
- **Set reasonable timeouts** to prevent runaway tasks

### Browser Support

- ✅ **Modern browsers** with Web Worker support
- ✅ **Automatic fallback** to main thread when workers unavailable
- ✅ **SSR/Node.js safe** - automatically runs inline
- ✅ **TypeScript** - Full type safety included

## Troubleshooting

**"Function uses external variable"**

```typescript
// Problem: External closure
const multiplier = 10;
const broken = threaded((x) => x * multiplier); // ❌

// Solution: Pass as parameter
const fixed = threaded((x, mult) => x * mult);
await fixed(5, multiplier); // ✅
```

**"Task timing out"**

```typescript
// Increase timeout for long-running tasks
const longTask = threaded(heavyFunction, { timeoutMs: 30000 });
```

**"Too many queued tasks"**

```typescript
// Increase queue size or change saturation policy
configureThreaded({
  maxQueue: 1000,
  saturation: "inline", // Run inline when queue full
});
```

## Next.js Integration Tips

```typescript
// pages/_app.tsx - Configure once globally
import { configureThreaded } from "nextjs-threadify";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    configureThreaded({
      name: "my-nextjs-app",
      poolSize: 4,
    });

    // Cleanup on unmount
    return () => destroyThreaded();
  }, []);

  return <Component {...pageProps} />;
}
```

```typescript
// components/DataTable.tsx - Use in components
import { parallelMap } from "nextjs-threadify";

export function DataTable({ data }) {
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(false);

  const processData = async () => {
    setLoading(true);

    const results = await parallelMap(data, (row) => ({
      ...row,
      calculated: expensiveCalculation(row),
      formatted: formatData(row),
    }));

    setProcessed(results);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={processData} disabled={loading}>
        {loading ? "Processing..." : "Process Data"}
      </button>
      {/* Render processed data */}
    </div>
  );
}
```

---

## License

MIT License - see LICENSE file for details.
