// parallelMap helper split out

import type { RunOptions } from "../core/types";
import { getPool } from "./pool";

export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, idx: number, all: T[]) => R | Promise<R>,
  options: RunOptions & { chunkSize?: number } = {}
): Promise<R[]> {
  const pool = getPool();
  const code = mapper.toString();

  const chunkSize = Math.max(
    1,
    options.chunkSize ??
      Math.ceil(items.length / Math.max(1, pool.getStats().poolSize))
  );
  const chunks: { start: number; end: number }[] = [];
  for (let i = 0; i < items.length; i += chunkSize)
    chunks.push({ start: i, end: Math.min(items.length, i + chunkSize) });

  const out: R[] = new Array(items.length);
  await Promise.all(
    chunks.map(({ start, end }) => {
      const slice = items
        .slice(start, end)
        .map((v, i) => [v, start + i] as const);
      const chunkRunner = (pairs: readonly (readonly [any, number])[]) => {
        const mapperFn = (0, eval)(`(${code})`);
        return pairs.map(([v, idx]) => mapperFn(v, idx, []));
      };
      return pool
        .run(chunkRunner.toString(), [slice], options)
        .then((results: any[]) => {
          for (let i = 0; i < results.length; i++) out[start + i] = results[i];
        });
    })
  );

  return out;
}
