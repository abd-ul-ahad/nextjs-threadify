// Main library exports - clean and focused API

// React hook for threaded execution
export { useThreaded } from "./src/react/Threadium";

// Core threading functionality
export { threaded, Threaded } from "./src/api/threaded";
export {
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
} from "./src/api/pool";
export { parallelMap } from "./src/api/parallel";

// Types
export type { 
  PoolStats, 
  RunOptions, 
  ThreadedOptions,
} from "./src/core/types";
