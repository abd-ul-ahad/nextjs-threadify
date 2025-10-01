export { Threadium, useThreaded } from "./src/react/threaded";

export { threaded } from "./src/api/threaded";
export {
  configureThreaded,
  destroyThreaded,
  getThreadedStats,
} from "./src/api/pool";
export { parallelMap } from "./src/api/parallel";
export { Threaded } from "./src/api/threaded";

export type { PoolStats, RunOptions, ThreadedOptions } from "./src/core/types";
