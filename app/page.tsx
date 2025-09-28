"use client";

import { useEffect, useState } from "react";
import { threaded, configureThreaded } from "@/library/cthread";

// configure the worker pool (adjust poolSize as you like)
configureThreaded({ poolSize: 3 });

// threaded function **must** be self-contained (no outside closures)
const threadedFib = threaded(function fibWrapped(n: number) {
  // fast-doubling algorithm using BigInt without bigint literals
  function fibDoubling(k: number): bigint {
    function _fd(m: number): [bigint, bigint] {
      if (m === 0) return [BigInt(0), BigInt(1)];
      const [a, b] = _fd(Math.floor(m / 2));
      const two = BigInt(2);

      // c = F(2k) = F(k) * (2*F(k+1) − F(k))
      const c = a * (b * two - a);
      // d = F(2k+1) = F(k)^2 + F(k+1)^2
      const d = a * a + b * b;

      if (m % 2 === 0) return [c, d];
      return [d, c + d];
    }
    return _fd(k)[0];
  }

  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw new Error("n must be a non-negative finite number");
  }

  return fibDoubling(n).toString(); // return string to main thread
});

export default function Home() {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setRunning(true);
      setError(null);
      try {
        // compute fib(1000). returns a string representation
        const fStr = await threadedFib(1000);
        console.log("fib(1000) length:", fStr.length);
        console.log("first 80 chars:", fStr.slice(0, 80));
        setOutput(fStr);
      } catch (err: any) {
        console.error("threaded fib error:", err);
        setError(String(err?.message ?? err));
      } finally {
        setRunning(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Threaded Fibonacci test</h2>

      {running && <p>⏳ computing fib(1000) in worker...</p>}

      {error && <p className="text-red-600">❌ Error: {error}</p>}

      {output && (
        <div className="mt-4">
          <p>✅ fib(1000) computed (string):</p>
          <textarea
            readOnly
            value={output}
            rows={8}
            className="w-full border rounded p-2 font-mono text-sm"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Length (digits): {output.length}
          </p>
        </div>
      )}
    </div>
  );
}
