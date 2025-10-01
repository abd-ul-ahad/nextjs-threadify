// Helpers to collect transferable objects (ArrayBuffers) deeply

/* eslint-disable @typescript-eslint/no-explicit-any */

function isTypedArray(
  v: any,
): v is
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array {
  return ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer
}

/**
 * Walks the object graph and returns a list of transferable items (ArrayBuffers).
 * This is conservative and bounded to avoid pathological traversals.
 */
export function collectTransferablesDeep(value: any, limit = 128): Transferable[] {
  const out: Transferable[] = []
  const stack: any[] = [value]
  const seen = new Set<any>()
  while (stack.length && out.length < limit) {
    const v = stack.pop()
    if (!v || typeof v !== "object") continue
    if (seen.has(v)) continue
    seen.add(v)

    if (v instanceof ArrayBuffer) {
      out.push(v)
      continue
    }
    if (isTypedArray(v)) {
      out.push(v.buffer)
      continue
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) stack.push(v[i])
      continue
    }
    for (const k in v) {
      try {
        stack.push(v[k])
      } catch {
        // ignore getters
      }
    }
  }
  return out
}
