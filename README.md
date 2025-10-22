# 🚀 NextJS Threadify

A powerful and easy-to-use threading library for Next.js applications that helps you run heavy computations in the background without blocking your main thread. This repository contains both the library implementation and a comprehensive demo application showcasing its capabilities.

## 📖 What is NextJS Threadify?

NextJS Threadify is a threading library designed specifically for Next.js applications. It enables developers to execute computationally intensive tasks in dedicated worker threads, preventing UI blocking and maintaining application responsiveness during heavy operations.

### ✨ Key Features

- **🚀 High Performance**: Optimized worker pool with memory pooling, lock-free queues, and efficient task scheduling
- **📱 Non-blocking UI**: Maintains interface responsiveness during intensive computations
- **🧠 Intelligent Load Balancing**: Automatic task distribution across available worker threads
- **⚡ Developer-friendly API**: Seamless integration with React hooks and standard JavaScript functions
- **🔧 Flexible Execution**: Multiple execution strategies for different use cases
- **📊 Built-in Monitoring**: Real-time performance statistics and debugging capabilities

## 🚀 Quick Start

### Installation

```bash
npm install nextjs-threadify
# or
yarn add nextjs-threadify
```

### Basic Usage

#### API Fetching with Threading

You can use threaded functions for API calls to keep your UI responsive:

```tsx
"use client";

import { useThreaded } from "nextjs-threadify";

export default function UserFetcher() {
  const fetchUsers = useThreaded(async (): Promise<User[]> => {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }, [lastFetchTime]);

  const handleFetchUsers = async () => {
    try {
      const result = await fetchUsers();
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    }
  };

  return <button onClick={handleFetchUsers}>Fetch Users</button>;
}
```

#### Heavy Computations

For CPU-intensive tasks:

```tsx
"use client";

import { useThreaded } from "nextjs-threadify";

export default function MyComponent() {
  // Create a threaded function
  const heavyCalculation = useThreaded((numbers: number[]) => {
    // This runs in a worker thread
    return numbers.reduce((sum, num) => sum + Math.sqrt(num), 0);
  });

  const handleClick = async () => {
    const result = await heavyCalculation([1, 4, 9, 16, 25]);
    console.log("Result:", result); // 15
  };

  return <button onClick={handleClick}>Run Heavy Calculation</button>;
}
```

### Running the Demo

This repository includes a comprehensive demonstration application showcasing the library's capabilities:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000 to view the demo
```

The demo application demonstrates:

- **Asynchronous Data Fetching**: API calls executed in worker threads
- **Performance Metrics**: Real-time monitoring of worker pool statistics
- **Automated Data Refresh**: Background processing with threading
- **Error Handling**: Comprehensive error management in worker contexts
- **Modern UI**: Responsive interface with smooth animations

## 📚 Core Concepts

### 1. useThreaded Hook

The `useThreaded` hook enables React components to execute functions in worker threads:

```tsx
import { useThreaded } from "nextjs-threadify";

function DataProcessor() {
  const processData = useThreaded((data: any[]) => {
    // Heavy data processing with optimized algorithms
    return data.map((item) => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));
  });

  const handleProcess = async () => {
    const result = await processData(largeDataSet);
    setProcessedData(result);
  };

  return <button onClick={handleProcess}>Process Data</button>;
}
```

### 2. threaded() Function

For applications outside of React, the `threaded()` function provides direct access to worker threading:

```tsx
import { threaded } from "nextjs-threadify";

const fibonacci = threaded((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

// Usage
const result = await fibonacci(10);
console.log(result); // 55
```

## 🎯 Advanced Features

### Optimized Worker Pool

The library implements an efficient worker pool with the following optimizations:

- **Memory Pooling**: Object reuse to minimize garbage collection overhead
- **Lock-Free Queues**: Thread-safe communication using atomic operations
- **SIMD Optimizations**: Vectorized operations for mathematical computations
- **Transferable Objects**: Zero-copy data transfer using ArrayBuffers

```tsx
import { configureThreaded } from "nextjs-threadify";

// Configure the ultra-fast worker pool
configureThreaded({
  poolSize: 4, // Number of workers (default: CPU cores - 1)
  minWorkTimeMs: 6, // Minimum work time to use workers
  warmup: true, // Enable worker warmup
  preferTransferables: true, // Enable zero-copy transfers
  strategy: "auto", // Execution strategy: auto, always, inline
});
```

### Parallel Processing

Execute multiple operations concurrently with built-in parallelization support:

```tsx
import { parallelMap } from "nextjs-threadify";

const processItems = async (items: any[]) => {
  const results = await parallelMap(
    items,
    (item) => ({
      ...item,
      processed: true,
      result: heavyComputation(item),
    }),
    { chunkSize: 100 } // Process in chunks
  );

  return results;
};
```

### Performance Monitoring

Track application performance metrics in real-time:

```tsx
import { getThreadedStats } from "nextjs-threadify";

// Get current statistics
const stats = getThreadedStats();
console.log("Pool size:", stats.poolSize);
console.log("Busy workers:", stats.busy);
console.log("Completed tasks:", stats.completed);
console.log("Average latency:", stats.avgLatencyMs + "ms");
```

## 🛠️ Configuration

Customize the worker pool behavior with comprehensive configuration options:

```tsx
import { configureThreaded } from "nextjs-threadify";

configureThreaded({
  poolSize: 4, // Number of workers (default: CPU cores - 1)
  maxQueue: 256, // Maximum queue size
  warmup: true, // Enable worker warmup
  strategy: "auto", // Execution strategy: auto, always, inline
  minWorkTimeMs: 6, // Minimum work time to use workers
  saturation: "enqueue", // Saturation policy: reject, inline, enqueue
  preferTransferables: true, // Enable zero-copy transfers
  name: "my-pool", // Pool name for debugging
  timeoutMs: 10000, // Default task timeout
});
```

## 📝 Best Practices

### ✅ Recommended Usage

1. **CPU-Intensive Computations**

   ```tsx
   // Appropriate: Complex mathematical operations
   const calculateStatistics = useThreaded((data: number[]) => {
     return {
       mean: data.reduce((sum, n) => sum + n, 0) / data.length,
       variance:
         data.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / data.length,
     };
   });
   ```

2. **Large Dataset Processing**

   ```tsx
   // Appropriate: Processing substantial data volumes
   const processDataset = useThreaded((records: any[]) => {
     return records
       .filter((record) => record.isValid)
       .map((record) => transformRecord(record));
   });
   ```

3. **Binary Data Operations**

   ```tsx
   // Appropriate: Using transferable objects for large data
   const processImageData = useThreaded((imageBuffer: ArrayBuffer) => {
     const view = new Uint8Array(imageBuffer);
     // Process image data
     return view;
   });
   ```

### ❌ Avoid These Patterns

1. **Simple Operations**

   ```tsx
   // Inappropriate: Overhead exceeds benefit
   const addNumbers = useThreaded((a: number, b: number) => a + b);
   ```

2. **DOM Access**

   ```tsx
   // Inappropriate: DOM not available in workers
   const invalidTask = useThreaded(() => {
     return document.querySelector(".element"); // ❌ Error
   });
   ```

3. **External Dependencies**
   ```tsx
   // Inappropriate: External variables not accessible
   const externalValue = "reference";
   const invalidTask = useThreaded(() => {
     return externalValue; // ❌ Undefined
   });
   ```

## 🔧 Troubleshooting

### Common Issues

**Q: Function execution fails in worker context**
A: Ensure functions are self-contained without external variable references. Worker functions are serialized and executed in isolation.

**Q: No performance improvement observed**
A: Verify that tasks are computationally intensive enough to justify threading overhead. Simple operations may perform better on the main thread.

**Q: Tasks execute on main thread instead of workers**
A: Check that task duration exceeds `minWorkTimeMs` threshold (default: 6ms). Brief operations automatically execute inline for efficiency.

**Q: Excessive memory consumption**
A: Implement transferable objects (ArrayBuffers) for large datasets to enable zero-copy transfers and optimize memory usage.

### Debug Mode

Enable debug logging and monitoring:

```tsx
import { configureThreaded, getThreadedStats } from "nextjs-threadify";

configureThreaded({
  name: "debug-pool",
  // Add debug options here
});

// Monitor performance
setInterval(() => {
  const stats = getThreadedStats();
  console.log("Pool stats:", stats);
}, 1000);
```

## 📈 Performance Optimization

1. **Worker Pool Sizing**

   - Default configuration: CPU cores - 1
   - CPU-intensive workloads: Increase worker count
   - I/O-bound operations: Reduce worker count

2. **Data Transfer Optimization**

   - Utilize ArrayBuffers for large datasets (zero-copy transfers)
   - Minimize serialization overhead
   - Group similar operations for batch processing

3. **Performance Monitoring**

   - Monitor usage patterns with `getThreadedStats()`
   - Adjust configuration based on performance metrics
   - Profile applications to identify optimization opportunities

4. **Execution Strategy Selection**
   - `auto`: Intelligent selection between worker and inline execution
   - `always`: Force worker execution for computationally intensive tasks
   - `inline`: Execute on main thread for debugging purposes

## 🌟 Real-World Examples

### Asynchronous Data Fetching

The demo application demonstrates threaded API operations:

```tsx
import { useThreaded } from "nextjs-threadify";

export default function UserFetcher() {
  const fetchUsers = useThreaded(async (): Promise<User[]> => {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });

  const handleFetchUsers = async () => {
    try {
      const result = await fetchUsers();
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    }
  };

  return <button onClick={handleFetchUsers}>Fetch Users</button>;
}
```

### Image Processing

```tsx
import { useThreaded } from "nextjs-threadify";

const processImage = useThreaded((imageData: Uint8Array) => {
  const processed = new Uint8Array(imageData.length);
  for (let i = 0; i < imageData.length; i += 4) {
    // Apply filters
    processed[i] = Math.min(255, imageData[i] * 1.2); // R
    processed[i + 1] = Math.min(255, imageData[i + 1] * 1.1); // G
    processed[i + 2] = Math.min(255, imageData[i + 2] * 0.9); // B
    processed[i + 3] = imageData[i + 3]; // A
  }
  return processed;
});
```

### Data Analysis

```tsx
import { useThreaded } from "nextjs-threadify";

const analyzeData = useThreaded((data: number[]) => {
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, n) => sum + n, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance =
    data.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / data.length;

  return { mean, median, variance, stdDev: Math.sqrt(variance) };
});
```

### Text Processing

```tsx
import { useThreaded } from "nextjs-threadify";

const processText = useThreaded((text: string) => {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  const uniqueWords = new Set(words).size;
  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / wordCount;

  return { wordCount, uniqueWords, avgWordLength };
});
```

## 📚 API Reference

### Core Functions

- `threaded(fn, options?)` - Creates a threaded function wrapper
- `useThreaded(fn, deps?)` - React hook for threaded function execution
- `configureThreaded(options)` - Configures global worker pool settings
- `getThreadedStats()` - Retrieves current pool statistics
- `destroyThreaded()` - Terminates the global worker pool

### Parallel Processing

- `parallelMap(items, mapper, options?)` - Processes items concurrently with configurable chunking

### Type Definitions

- `ThreadedOptions` - Worker pool configuration interface
- `RunOptions` - Per-execution configuration options
- `PoolStats` - Runtime performance statistics interface

### Configuration Options

```tsx
interface ThreadedOptions {
  poolSize?: number; // Number of workers (default: CPU cores - 1)
  maxQueue?: number; // Maximum queue size (default: 256)
  warmup?: boolean; // Enable worker warmup (default: true)
  strategy?: "auto" | "always" | "inline"; // Execution strategy
  minWorkTimeMs?: number; // Minimum work time to use workers (default: 6)
  saturation?: "reject" | "inline" | "enqueue"; // Saturation policy
  preferTransferables?: boolean; // Enable zero-copy transfers
  name?: string; // Pool name for debugging
  timeoutMs?: number; // Default task timeout
}
```

## 🤝 Contributing

Contributions are welcome! Please refer to our [Contributing Guide](CONTRIBUTING.md) for detailed information.

## 📄 License

This project is licensed under the BSD-2-Clause License. See the [LICENSE](LICENSE) file for complete details.

## 🙏 Acknowledgments

- Developed for the Next.js developer community
- Inspired by modern web worker architectural patterns
- Designed with performance and developer experience as primary considerations
- Implements advanced optimizations including memory pooling and lock-free data structures

---

**Developed with ❤️ for the Next.js community**

For additional examples and advanced usage patterns, explore the [examples directory](library/nextjs-threadify/examples/) and the [demo application](app/page.tsx).
