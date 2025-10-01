// Worker blob runtime creation, kept functionally identical to original

/* eslint-disable @typescript-eslint/no-explicit-any */

export function makeWorkerBlobUrl() {
  const workerFn = () => {
    const serializeError = (err: any) => {
      if (!err) return { message: "Unknown error" };
      return {
        message: err.message || String(err),
        name: err.name || "Error",
        stack: err.stack || "",
      };
    };

    function isTypedArray(v: any): boolean {
      return (
        typeof v === "object" &&
        v &&
        ArrayBuffer.isView(v) &&
        v.buffer instanceof ArrayBuffer
      );
    }

    function collectTransferablesDeep(value: any, limit = 128): Transferable[] {
      const out: Transferable[] = [];
      const stack: any[] = [value];
      const seen = new Set<any>();
      while (stack.length && out.length < limit) {
        const v = stack.pop();
        if (!v || typeof v !== "object") continue;
        if (seen.has(v)) continue;
        seen.add(v);

        if (v instanceof ArrayBuffer) {
          out.push(v);
          continue;
        }
        if (isTypedArray(v)) {
          // @ts-ignore
          out.push(v.buffer);
          continue;
        }
        if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) stack.push(v[i]);
          continue;
        }
        for (const k in v) {
          try {
            stack.push(v[k]);
          } catch {
            // ignore
          }
        }
      }
      return out;
    }

    const fnCache = new Map<string, Function>();

    onmessage = async (e: MessageEvent) => {
      const msg = e.data || {};
      const { id, code, args, preferTransferables } = msg;
      if (!id) return;

      try {
        let fn = fnCache.get(code);
        if (!fn) {
          fn = new Function(
            "ARGS",
            `"use strict"; const __FN__ = (${code}); return __FN__.apply(null, ARGS);`
          );
          fnCache.set(code, fn);
        }
        const result = await (fn as any)(args);

        if (preferTransferables) {
          const transfers = collectTransferablesDeep(result);
          // @ts-ignore
          postMessage({ id, ok: true, result }, transfers);
        } else {
          // @ts-ignore
          postMessage({ id, ok: true, result });
        }
      } catch (err: any) {
        // @ts-ignore
        postMessage({ id, ok: false, error: serializeError(err) });
      }
    };
  };

  const src = `(${workerFn.toString()})();`;
  const blob = new Blob([src], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}
