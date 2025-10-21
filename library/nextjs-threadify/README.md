# 🚀 NextJS Threadify

A powerful and easy-to-use threading library for Next.js applications that helps you run heavy computations in the background without blocking your main thread.

## 📖 What is NextJS Threadify?

NextJS Threadify allows you to run JavaScript functions in separate worker threads, making your web applications faster and more responsive. Instead of running heavy calculations on the main thread (which can freeze your UI), you can move them to background workers.

### ✨ Key Benefits

- **🚀 Better Performance**: Run heavy computations without blocking your UI
- **📱 Responsive UI**: Keep your interface smooth even during intensive tasks
- **🧠 Smart Clustering**: Automatically groups similar tasks for maximum efficiency
- **⚡ Easy to Use**: Simple API that works with React hooks and regular functions
- **🔧 Flexible**: Works with any JavaScript function

## 🚀 Quick Start

### Installation

```bash
npm install nextjs-threadify
# or
yarn add nextjs-threadify
```

### Basic Usage

```tsx
import { useThreaded, Threadium } from "nextjs-threadify";

function MyComponent() {
  // Create a threaded function
  const heavyCalculation = useThreaded((numbers: number[]) => {
    // This runs in a worker thread
    return numbers.reduce((sum, num) => sum + Math.sqrt(num), 0);
  });

  const handleClick = async () => {
    const result = await heavyCalculation([1, 4, 9, 16, 25]);
    console.log("Result:", result); // 15
  };

  return (
    <Threadium>
      <button onClick={handleClick}>Run Heavy Calculation</button>
    </Threadium>
  );
}
```

## 📚 Core Concepts

### 1. Threadium Component

The `<Threadium>` component sets up the worker environment for your app:

```tsx
import { Threadium } from "nextjs-threadify";

function App() {
  return (
    <Threadium poolSize={4}>
      <YourApp />
    </Threadium>
  );
}
```

**Props:**

- `poolSize`: Number of worker threads (default: CPU cores - 1)
- `minWorkTimeMs`: Minimum work time to use workers (default: 6ms)
- `warmup`: Enable worker warmup (default: true)

### 2. useThreaded Hook

Convert any function to run in a worker thread:

```tsx
import { useThreaded } from "nextjs-threadify";

function DataProcessor() {
  const processData = useThreaded((data: any[]) => {
    // Heavy data processing
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

### 3. threaded() Function

For non-React usage, use the `threaded()` function:

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

### Smart Clustering

The library automatically groups similar tasks for better performance:

```tsx
import { cpuIntensive, memoryIntensive, ioBound } from "nextjs-threadify";

// CPU-intensive tasks (math, algorithms)
const mathTask = cpuIntensive((numbers: number[]) => {
  return numbers.map((n) => Math.sqrt(n * n + 1));
});

// Memory-intensive tasks (large data processing)
const dataTask = memoryIntensive((data: any[]) => {
  return data.sort().filter((item) => item.active);
});

// I/O-bound tasks (string processing, serialization)
const textTask = ioBound((text: string) => {
  return text.split("\n").map((line) => line.toUpperCase());
});
```

### High Priority Tasks

For urgent computations:

```tsx
import { highPriority } from "nextjs-threadify";

const urgentTask = highPriority((data: any) => {
  // Critical calculation that needs to run first
  return processCriticalData(data);
});
```

### Batch Processing

Process multiple items efficiently:

```tsx
import { clusteredBatch } from "nextjs-threadify";

const processItems = async (items: any[]) => {
  const results = await clusteredBatch(
    items,
    (item) => ({
      ...item,
      processed: true,
      result: heavyComputation(item),
    }),
    { batchSize: 100 }
  );

  return results;
};
```

## 📊 Performance Monitoring

Monitor your application's performance:

```tsx
import { getThreadedStats, startPerformanceMonitoring } from "nextjs-threadify";

// Get current statistics
const stats = getThreadedStats();
console.log("Pool size:", stats.poolSize);
console.log("Busy workers:", stats.busy);
console.log("Completed tasks:", stats.completed);

// Start real-time monitoring
const stopMonitoring = startPerformanceMonitoring(1000, (stats) => {
  console.log("Performance:", stats);
});

// Stop monitoring when done
stopMonitoring();
```

## 🛠️ Configuration

Configure the worker pool globally:

```tsx
import { configureThreaded } from "nextjs-threadify";

configureThreaded({
  poolSize: 6, // Number of workers
  enableClustering: true, // Enable smart clustering
  clusteringStrategy: "hybrid", // Clustering strategy
  enableWorkerSpecialization: true, // Auto-specialize workers
  enableLoadBalancing: true, // Balance work across workers
  maxClusterSize: 10, // Max tasks per cluster
  clusterTimeoutMs: 2000, // Cluster timeout
  enablePerformanceTracking: true, // Track performance metrics
});
```

## 📝 Best Practices

### ✅ Do's

1. **Use for Heavy Computations**

   ```tsx
   // Good: Heavy math operations
   const mathTask = useThreaded((numbers: number[]) => {
     return numbers.map((n) => Math.sqrt(n * n + 1));
   });
   ```

2. **Process Large Datasets**

   ```tsx
   // Good: Large data processing
   const processData = useThreaded((data: any[]) => {
     return data
       .filter((item) => item.active)
       .map((item) => ({
         ...item,
         processed: true,
       }));
   });
   ```

3. **Use Appropriate Task Types**
   ```tsx
   // Good: Use specialized task types
   const cpuTask = cpuIntensive(heavyMathFunction);
   const memoryTask = memoryIntensive(dataProcessingFunction);
   ```

### ❌ Don'ts

1. **Don't Use for Simple Operations**

   ```tsx
   // Bad: Too simple for threading
   const simpleAdd = useThreaded((a: number, b: number) => a + b);
   ```

2. **Don't Access DOM or Browser APIs**

   ```tsx
   // Bad: Can't access DOM in workers
   const badTask = useThreaded(() => {
     document.getElementById("myElement"); // ❌ Won't work
   });
   ```

3. **Don't Use External Variables**
   ```tsx
   // Bad: External variables not available
   const externalVar = "hello";
   const badTask = useThreaded(() => {
     return externalVar; // ❌ Won't work
   });
   ```

## 🔧 Troubleshooting

### Common Issues

**Q: My function isn't running in a worker**
A: Make sure your function is self-contained and doesn't reference external variables.

**Q: Performance isn't improving**
A: Check if your tasks are heavy enough to benefit from threading. Simple operations might be faster on the main thread.

**Q: Workers aren't being used**
A: Ensure you're wrapping your app with `<Threadium>` and the task takes longer than `minWorkTimeMs`.

### Debug Mode

Enable debug logging:

```tsx
import { configureThreaded } from "nextjs-threadify";

configureThreaded({
  name: "debug-pool",
  // Add debug options here
});
```

## 📈 Performance Tips

1. **Choose the Right Pool Size**

   - Default: CPU cores - 1
   - For CPU-intensive: Use more workers
   - For I/O-bound: Use fewer workers

2. **Use Appropriate Task Types**

   - `cpuIntensive`: Math, algorithms, computations
   - `memoryIntensive`: Large data processing
   - `ioBound`: String processing, serialization

3. **Batch Similar Tasks**

   - Group similar operations together
   - Use `clusteredBatch` for multiple items

4. **Monitor Performance**
   - Use `getThreadedStats()` to monitor usage
   - Adjust configuration based on metrics

## 🌟 Real-World Examples

### Image Processing

```tsx
import { memoryIntensive } from "nextjs-threadify";

const processImage = memoryIntensive((imageData: Uint8Array) => {
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
import { cpuIntensive } from "nextjs-threadify";

const analyzeData = cpuIntensive((data: number[]) => {
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
import { ioBound } from "nextjs-threadify";

const processText = ioBound((text: string) => {
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

- `threaded(fn, options?)` - Convert function to threaded version
- `useThreaded(fn, deps?)` - React hook for threaded functions
- `configureThreaded(options)` - Configure global settings

### Specialized Task Types

- `cpuIntensive(fn, options?)` - CPU-optimized tasks
- `memoryIntensive(fn, options?)` - Memory-optimized tasks
- `ioBound(fn, options?)` - I/O-optimized tasks
- `highPriority(fn, options?)` - High-priority tasks

### Batch Processing

- `clusteredBatch(items, processor, options?)` - Process items in batches
- `smartParallelMap(items, mapper, options?)` - Smart parallel processing

### Monitoring

- `getThreadedStats()` - Get pool statistics
- `getClusterStats()` - Get clustering statistics
- `startPerformanceMonitoring(interval, callback?)` - Start monitoring

### React Components

- `<Threadium>` - Worker pool provider component

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the BSD-2-Clause License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Next.js community
- Inspired by modern web worker patterns
- Designed for performance and ease of use

---

**Made with ❤️ for the Next.js community**

For more examples and advanced usage, check out our [examples directory](examples/) and [documentation](docs/).
