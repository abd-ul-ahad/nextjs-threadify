# next-threaded (A→Z Guide)

A lightweight utility to run functions off the main thread in Next.js/browser using a small Web Worker pool.
Includes:

- `@Threaded` decorator for top-level functions and class methods (TypeScript decorators)
- `threaded(fn)` wrapper for anywhere usage, including React `useEffect`

Important constraint: The function you run in a worker must be self-contained and pure (no closures or access to outer variables).

## 1) Authoring the Library

- Directory structure (suggested):
  - `src/index.ts` (exports: `threaded`, `Threaded`, `configureThreaded`)
  - Do NOT rely on DOM globals server-side; workers are browser-only unless you add a Node worker implementation.
- TypeScript:
  - Enable decorators if you will use `@Threaded` in your own code.
    - If you target new TS decorators: set `"experimentalDecorators": false` and ensure TS ≥ 5.0 with `"emitDecoratorMetadata": false` (not required).
    - If you need legacy decorators: set `"experimentalDecorators": true`.
  - Provide `.d.ts` typings by compiling with `tsc` or bundling via `tsup`.

Example `tsconfig.json` for a library:
{
"compilerOptions": {
"target": "ES2020",
"module": "ESNext",
"lib": ["ES2021", "DOM"],
"declaration": true,
"declarationMap": true,
"outDir": "dist",
"moduleResolution": "Bundler",
"strict": true,
"skipLibCheck": true
},
"include": ["src"]
}

## 2) Building the Library

Option A: TypeScript only (simple)

- Commands:
  - `npm init -y`
  - `npm i -D typescript`
  - `npx tsc --init` (adjust config as above)
  - `npx tsc` to produce `dist/`

Option B: tsup (bundled)

- `npm i -D tsup`
- Add to `package.json`:
  - `"build": "tsup src/index.ts --dts --format esm,cjs --clean"`
- `npm run build` → outputs ESM/CJS plus types.

Recommended `package.json` fields:
{
"name": "next-threaded",
"version": "0.1.0",
"type": "module",
"main": "./dist/index.cjs",
"module": "./dist/index.js",
"types": "./dist/index.d.ts",
"exports": {
".": {
"import": "./dist/index.js",
"require": "./dist/index.cjs",
"types": "./dist/index.d.ts"
}
},
"sideEffects": false
}

## 3) Testing Locally in a Next.js App

- Install locally via `npm link` or use a relative path:
  - `npm link` in your library folder
  - In your Next.js app: `npm link next-threaded`
- Or, before publishing, use `npm pack` in the library folder and `npm i ../next-threaded-0.1.0.tgz` in your app.
- In a client component:
  import { threaded } from "next-threaded"

  const heavy = threaded(function fib(n: number) {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2)
  })

  const res = await heavy(38)

Decorator example (top-level function):
import { Threaded } from "next-threaded"

@Threaded
export function heavy(n: number) {
return n <= 1 ? n : heavy(n - 1) + heavy(n - 2)
}

// call it
const res = await heavy(38)

Notes:

- Use decorators only on top-level function declarations or class methods.
- For inline/local functions (e.g., inside `useEffect`), use `threaded(fn)` instead.

## 4) Publishing to npm

- Ensure you’re logged in: `npm login`
- Choose a unique package name or use an npm scope (e.g., `@your-scope/next-threaded`)
- Update `version` in `package.json`
- Run `npm publish --access public` (for scoped packages)
- Add a README, license, and repository fields to `package.json` for credibility.

## 5) API Design Notes and Best Practices

- Pool sizing: `configureThreaded({ poolSize: 2 | 3 | 4 })`
- Data transfer:
  - Pass large `ArrayBuffer`, `ImageBitmap`, etc., via `transfer` option to avoid copies.
  - Example:
    const run = threaded(fn, { transfer: [myArrayBuffer] })
- Errors from worker are surfaced as `Error` instances with message/stack where available.
- Server-side (Node) execution is not enabled by default. If your runtime supports `worker_threads`, you can add a Node path later.

## 6) Limitations

- No closures: define all logic within the function sent to `threaded` or the decorated function itself.
- Browser-only by default: Next.js server/edge runtimes differ and may not allow worker threads.
- Use pure CPU-bound tasks. For I/O or web requests, prefer regular async code.

## 7) Changelog / Roadmap (suggested)

- v0.1: Browser worker pool, decorator + wrapper
- v0.2: Optional Node worker_threads path (where supported)
- v1.0: Transferable detection helpers, better TypeScript ergonomics
