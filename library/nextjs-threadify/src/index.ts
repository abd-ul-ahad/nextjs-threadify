// Consolidated public API surface for modular implementation

export { threaded, Threaded } from "./api/threaded";
export {
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
} from "./api/pool";
export { parallelMap } from "./api/parallel";
export type { PoolStats, RunOptions, ThreadedOptions } from "./core/types";

// React integration
export { Threadium, useThreaded } from "./react/Threadium";
