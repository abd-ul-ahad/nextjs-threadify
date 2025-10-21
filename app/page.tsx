
"use client";

import { 
  useThreaded,
  Threadium,
  clusteredThreaded,
  cpuIntensive,
  memoryIntensive,
  ioBound,
  highPriority,
  clusteredBatch,
  smartParallelMap,
  performanceCluster,
  configureThreaded,
  getThreadedStats,
  getClusterStats,
  startPerformanceMonitoring,
  benchmarkClustering,
  createSyntheticWorkload
} from "../library/nextjs-threadify";
import { useState, useEffect } from "react";

export default function ClusteringDemo() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [monitoring, setMonitoring] = useState<any>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [runningComparison, setRunningComparison] = useState(false);

  // Configure clustering on component mount
  useEffect(() => {
    configureThreaded({
      poolSize: 6,
      enableClustering: true,
      clusteringStrategy: "hybrid",
      enableWorkerSpecialization: true,
      enableLoadBalancing: true,
      maxClusterSize: 10,
      clusterTimeoutMs: 2000,
      enablePerformanceTracking: true,
    });

    // Start performance monitoring
    const stopMonitoring = startPerformanceMonitoring(2000, (stats) => {
      setMonitoring(stats);
    });

    return () => {
      stopMonitoring();
    };
  }, []);

  // Test 1: Basic useThreaded with clustering
  const basicHeavy = useThreaded((n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.sqrt(i);
    return s;
  }, []);

  // Performance comparison tasks (defined as hooks at component level)
  const baselineTask = useThreaded((n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.sqrt(i);
    return s;
  }, []);

  const clusteredTask = useThreaded((n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.sqrt(i);
    return s;
  }, []);

  // Test 2: CPU-intensive task
  const cpuTask = cpuIntensive((n: number) => {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += Math.sqrt(i * i + 1) + Math.sin(i) + Math.cos(i);
    }
    return result;
  });

  // Test 3: Memory-intensive task
  const memoryTask = memoryIntensive((data: number[]) => {
    const processed = data.map(x => x * 2);
    const filtered = processed.filter(x => x > 100);
    const sorted = filtered.sort((a, b) => a - b);
    return sorted.slice(0, 10); // Return first 10 items
  });

  // Test 4: I/O-bound task
  const ioTask = ioBound((text: string) => {
    return text.split('\n').map(line => line.toUpperCase()).join('\n');
  });

  // Test 5: High-priority task
  const priorityTask = highPriority((data: number[]) => {
    return data.reduce((sum, num) => sum + Math.sqrt(num), 0);
  });

  // Test 6: Clustered batch processing (simplified for worker compatibility)
  const testBatchProcessing = async () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      value: Math.random() * 1000,
      category: ['A', 'B', 'C'][i % 3],
    }));

    // Use individual clusteredThreaded calls instead of clusteredBatch
    const results = await Promise.all(
      testData.map(item => 
        clusteredThreaded((data) => ({
          ...data,
          processed: true,
          computed: Math.sqrt(data.value),
          timestamp: Date.now(),
        }))(item)
      )
    );

    return results;
  };

  // Test 7: Smart parallel processing (simplified for worker compatibility)
  const testSmartParallel = async () => {
    const numbers = Array.from({ length: 30 }, (_, i) => i);

    // Use individual clusteredThreaded calls instead of smartParallelMap
    const results = await Promise.all(
      numbers.map((num, index) => 
        clusteredThreaded((n, idx, total) => {
          let result = n;
          for (let i = 0; i < 10; i++) {
            result = Math.sqrt(result + i);
          }
          return {
            original: n,
            computed: result,
            index: idx,
            total: total,
          };
        })(num, index, numbers.length)
      )
    );

    return results;
  };

  // Test 8: Performance clustering (simplified for worker compatibility)
  const testPerformanceClustering = async () => {
    // Use individual high-priority tasks instead of performanceCluster
    const tasks = Array.from({ length: 8 }, (_, i) => 
      highPriority((x: number) => {
        let result = x;
        for (let j = 0; j < 5; j++) {
          result = Math.sqrt(result + j);
        }
        return result;
      })
    );

    const results = await Promise.all(
      tasks.map(task => task(Math.random() * 100))
    );

    return results;
  };

  // Test 9: Benchmarking
  const testBenchmarking = async () => {
    const testWorkload = createSyntheticWorkload("cpu", "low", 20);
    const benchmark = await benchmarkClustering(testWorkload, 3, 20);
    return benchmark;
  };

  // Run all tests
  const runAllTests = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      // Test 1: Basic heavy computation
      console.log("Running basic heavy computation...");
      testResults.basicHeavy = await basicHeavy(100000);

      // Test 2: CPU-intensive task
      console.log("Running CPU-intensive task...");
      testResults.cpuTask = await cpuTask(5000);

      // Test 3: Memory-intensive task
      console.log("Running memory-intensive task...");
      testResults.memoryTask = await memoryTask([50, 60, 70, 80, 90, 100, 110, 120, 130, 140]);

      // Test 4: I/O-bound task
      console.log("Running I/O-bound task...");
      testResults.ioTask = await ioTask("hello\nworld\nclustering\ntest");

      // Test 5: High-priority task
      console.log("Running high-priority task...");
      testResults.priorityTask = await priorityTask([4, 9, 16, 25, 36]);

      // Test 6: Batch processing
      console.log("Running batch processing...");
      testResults.batchProcessing = await testBatchProcessing();

      // Test 7: Smart parallel processing
      console.log("Running smart parallel processing...");
      testResults.smartParallel = await testSmartParallel();

      // Test 8: Performance clustering
      console.log("Running performance clustering...");
      testResults.performanceClustering = await testPerformanceClustering();

      // Test 9: Benchmarking
      console.log("Running benchmarking...");
      testResults.benchmarking = await testBenchmarking();

      // Get final statistics
      testResults.stats = getThreadedStats();
      testResults.clusterStats = getClusterStats();

      setResults(testResults);
      console.log("All tests completed successfully!", testResults);

    } catch (error) {
      console.error("Test failed:", error);
      testResults.error = error instanceof Error ? error.message : String(error);
    } finally {
      setLoading(false);
    }
  };

  // Get current statistics
  const getStats = () => {
    const currentStats = getThreadedStats();
    const currentClusterStats = getClusterStats();
    setStats({ pool: currentStats, clustering: currentClusterStats });
  };

  // Run performance comparison between clustered and non-clustered
  const runPerformanceComparison = async () => {
    setRunningComparison(true);
    const comparisonData: any = {};

    try {
      // Test 1: Basic computation without clustering
      console.log("Running baseline (no clustering)...");
      configureThreaded({
        enableClustering: false,
        enableWorkerSpecialization: false,
        enableLoadBalancing: false,
      });

      const baselineStart = performance.now();
      await baselineTask(50000);
      const baselineTime = performance.now() - baselineStart;

      // Test 2: Same computation with clustering
      console.log("Running with clustering...");
      configureThreaded({
        enableClustering: true,
        enableWorkerSpecialization: true,
        enableLoadBalancing: true,
        clusteringStrategy: "hybrid",
      });

      const clusteredStart = performance.now();
      await clusteredTask(50000);
      const clusteredTime = performance.now() - clusteredStart;

      // Calculate improvements
      const basicImprovement = ((baselineTime - clusteredTime) / baselineTime) * 100;

      comparisonData.baseline = {
        basicComputation: baselineTime,
        clusteringEnabled: false,
        workerSpecialization: false,
        loadBalancing: false,
      };

      comparisonData.clustered = {
        basicComputation: clusteredTime,
        clusteringEnabled: true,
        workerSpecialization: true,
        loadBalancing: true,
      };

      comparisonData.improvements = {
        basicComputation: basicImprovement,
        overallImprovement: basicImprovement,
      };

      setComparisonResults(comparisonData);
      console.log("Performance comparison completed!", comparisonData);

    } catch (error) {
      console.error("Comparison failed:", error);
      comparisonData.error = error instanceof Error ? error.message : String(error);
    } finally {
      setRunningComparison(false);
    }
  };

  return (
    <Threadium 
      poolSize={6}
    >
      <div className="p-6 space-y-6 max-w-6xl mx-auto bg-gray-900 min-h-screen">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          🚀 NextJS Threadify Clustering Demo
        </h1>

        {/* Control Panel */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Control Panel</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={runAllTests}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {loading ? "Running Tests..." : "🧪 Run All Clustering Tests"}
            </button>
            <button
              onClick={getStats}
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
            >
              📊 Get Current Stats
            </button>
            <button
              onClick={runPerformanceComparison}
              disabled={runningComparison}
              className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {runningComparison ? "Running Comparison..." : "⚡ Performance Comparison"}
            </button>
          </div>
        </div>

        {/* Performance Monitoring */}
        {monitoring && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-white">📈 Real-time Performance Monitoring</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-1">Pool Size</div>
                <div className="text-2xl font-bold text-blue-600">{monitoring.poolSize}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-1">Busy Workers</div>
                <div className="text-2xl font-bold text-orange-600">{monitoring.busy}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-1">Queued Tasks</div>
                <div className="text-2xl font-bold text-red-600">{monitoring.queued}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-1">Avg Latency</div>
                <div className="text-2xl font-bold text-green-600">{monitoring.avgLatencyMs}ms</div>
              </div>
            </div>
            {monitoring.clustering && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Total Clusters</div>
                  <div className="text-2xl font-bold text-purple-600">{monitoring.clustering.totalClusters}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Active Clusters</div>
                  <div className="text-2xl font-bold text-indigo-600">{monitoring.clustering.activeClusters}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Clustering Efficiency</div>
                  <div className="text-2xl font-bold text-teal-600">{(monitoring.clustering.clusteringEfficiency * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Load Balance Score</div>
                  <div className="text-2xl font-bold text-pink-600">{(monitoring.clustering.loadBalanceScore * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        {Object.keys(results).length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-white">✅ Test Results</h2>
            <div className="space-y-4">
              {results.basicHeavy && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Basic Heavy Computation:</div>
                  <div className="text-lg font-semibold text-green-600">Result: {Math.round(results.basicHeavy).toLocaleString()}</div>
                </div>
              )}
              {results.cpuTask && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">CPU-Intensive Task:</div>
                  <div className="text-lg font-semibold text-blue-600">Result: {Math.round(results.cpuTask).toLocaleString()}</div>
                </div>
              )}
              {results.memoryTask && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Memory-Intensive Task:</div>
                  <div className="text-lg font-semibold text-purple-600">Processed {results.memoryTask.length} items</div>
                </div>
              )}
              {results.ioTask && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">I/O-Bound Task:</div>
                  <div className="text-lg font-semibold text-orange-600">Result: {results.ioTask}</div>
                </div>
              )}
              {results.priorityTask && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">High-Priority Task:</div>
                  <div className="text-lg font-semibold text-red-600">Result: {Math.round(results.priorityTask).toLocaleString()}</div>
                </div>
              )}
              {results.batchProcessing && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Batch Processing:</div>
                  <div className="text-lg font-semibold text-indigo-600">Processed {results.batchProcessing.length} items with clustering</div>
                </div>
              )}
              {results.smartParallel && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Smart Parallel Processing:</div>
                  <div className="text-lg font-semibold text-teal-600">Processed {results.smartParallel.length} items with adaptive clustering</div>
                </div>
              )}
              {results.performanceClustering && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Performance Clustering:</div>
                  <div className="text-lg font-semibold text-pink-600">Completed {results.performanceClustering.length} tasks with performance optimization</div>
                </div>
              )}
              {results.benchmarking && (
                <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
                  <div className="font-bold text-lg text-gray-800 mb-2">Performance Benchmark:</div>
                  <div className="text-lg font-semibold text-yellow-600">
                    Improvement: {results.benchmarking.improvement.duration.toFixed(1)}% faster with clustering
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Comparison */}
        {comparisonResults && (
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-white">⚡ Performance Comparison: With vs Without Clustering</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Without Clustering */}
              <div className="bg-white p-6 rounded-lg shadow-md border-2 border-red-200">
                <h3 className="font-bold text-xl mb-4 text-red-600">❌ Without Clustering</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Basic Computation:</span>
                    <span className="font-bold text-red-600">{comparisonResults.baseline.basicComputation.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Clustering:</span>
                    <span className="font-bold text-red-600">❌ Disabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Worker Specialization:</span>
                    <span className="font-bold text-red-600">❌ Disabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Load Balancing:</span>
                    <span className="font-bold text-red-600">❌ Disabled</span>
                  </div>
                </div>
              </div>

              {/* With Clustering */}
              <div className="bg-white p-6 rounded-lg shadow-md border-2 border-green-200">
                <h3 className="font-bold text-xl mb-4 text-green-600">✅ With Clustering</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Basic Computation:</span>
                    <span className="font-bold text-green-600">{comparisonResults.clustered.basicComputation.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Clustering:</span>
                    <span className="font-bold text-green-600">✅ Enabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Worker Specialization:</span>
                    <span className="font-bold text-green-600">✅ Enabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Load Balancing:</span>
                    <span className="font-bold text-green-600">✅ Enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Improvements */}
            <div className="bg-white p-6 rounded-lg shadow-md border-2 border-yellow-200">
              <h3 className="font-bold text-xl mb-4 text-yellow-600">🚀 Performance Improvements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {comparisonResults.improvements.basicComputation > 0 ? '+' : ''}{comparisonResults.improvements.basicComputation.toFixed(1)}%
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Basic Computation</div>
                  <div className="text-xs text-gray-500">Faster execution</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {comparisonResults.improvements.overallImprovement > 0 ? '+' : ''}{comparisonResults.improvements.overallImprovement.toFixed(1)}%
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Overall Improvement</div>
                  <div className="text-xs text-gray-500">Average performance gain</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {comparisonResults.baseline.basicComputation > comparisonResults.clustered.basicComputation ? '⚡' : '📊'}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Result</div>
                  <div className="text-xs text-gray-500">
                    {comparisonResults.baseline.basicComputation > comparisonResults.clustered.basicComputation 
                      ? 'Clustering wins!' 
                      : 'Performance measured'}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="mt-6 bg-white p-4 rounded-lg shadow-md border-2 border-blue-200">
              <h4 className="font-bold text-lg mb-3 text-blue-600">🎯 Key Benefits of Using Our Clustering Package:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Intelligent Task Grouping</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Worker Specialization</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Advanced Load Balancing</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Real-time Optimization</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Performance Monitoring</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="font-semibold text-gray-700">Dynamic Configuration</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-white">📊 Current Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
                <h3 className="font-bold text-xl mb-4 text-gray-800">Pool Statistics</h3>
                <div className="text-base space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Pool Size:</span>
                    <span className="font-bold text-blue-600">{stats.pool.poolSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Busy:</span>
                    <span className="font-bold text-orange-600">{stats.pool.busy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Idle:</span>
                    <span className="font-bold text-green-600">{stats.pool.idle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Queued:</span>
                    <span className="font-bold text-red-600">{stats.pool.queued}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Completed:</span>
                    <span className="font-bold text-purple-600">{stats.pool.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Failed:</span>
                    <span className="font-bold text-red-600">{stats.pool.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Avg Latency:</span>
                    <span className="font-bold text-indigo-600">{stats.pool.avgLatencyMs}ms</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
                <h3 className="font-bold text-xl mb-4 text-gray-800">Clustering Statistics</h3>
                <div className="text-base space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total Clusters:</span>
                    <span className="font-bold text-purple-600">{stats.clustering.totalClusters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Active Clusters:</span>
                    <span className="font-bold text-indigo-600">{stats.clustering.activeClusters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Avg Cluster Size:</span>
                    <span className="font-bold text-teal-600">{stats.clustering.avgClusterSize.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Clustering Efficiency:</span>
                    <span className="font-bold text-green-600">{(stats.clustering.clusteringEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Load Balance Score:</span>
                    <span className="font-bold text-pink-600">{(stats.clustering.loadBalanceScore * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">CPU Utilization:</span>
                    <span className="font-bold text-orange-600">{stats.clustering.resourceUtilization.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Memory Utilization:</span>
                    <span className="font-bold text-blue-600">{stats.clustering.resourceUtilization.memory.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Overview */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-white">🎯 Clustering Features Demonstrated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Task Clustering</div>
              <div className="text-sm text-gray-600">Intelligent task grouping and optimization</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Worker Specialization</div>
              <div className="text-sm text-gray-600">CPU, memory, and I/O optimized workers</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Load Balancing</div>
              <div className="text-sm text-gray-600">Smart worker selection and distribution</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Performance Monitoring</div>
              <div className="text-sm text-gray-600">Real-time clustering effectiveness tracking</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Benchmarking</div>
              <div className="text-sm text-gray-600">Performance improvement measurement</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200">
              <div className="font-bold text-lg text-gray-800 mb-2">✅ Dynamic Configuration</div>
              <div className="text-sm text-gray-600">Runtime clustering strategy adjustment</div>
            </div>
          </div>
        </div>
      </div>
    </Threadium>
  );
}
