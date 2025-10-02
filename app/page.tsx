// "use client";

// import { useState } from "react";
// import { threaded, useThreaded } from "../library/nextjs-threadify";

// // -----------------------------
// // Threaded function approach
// // -----------------------------
// const fetchTodoThreadedFn = threaded(async () => {
//   const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
//   return res.json();
// });

// export default function Home() {
//   const [todoHook, setTodoHook] = useState<any>(null);
//   const [todoFn, setTodoFn] = useState<any>(null);

//   // -----------------------------
//   // useThreaded hook approach
//   // -----------------------------
//   const fetchTodoWithHook = useThreaded(async () => {
//     const res = await fetch("https://jsonplaceholder.typicode.com/todos");
//     return res.json();
//   }, []);

//   const fetchWithHook = async () => {
//     try {
//       const data = await fetchTodoWithHook();
//       setTodoHook(data);
//       console.log("Hook result:", data);
//     } catch (err) {
//       console.error("Hook error:", err);
//     }
//   };

//   // -----------------------------
//   // threaded function approach
//   // -----------------------------
//   const fetchWithThreadedFn = async () => {
//     try {
//       const data = await fetchTodoThreadedFn();
//       setTodoFn(data);
//       console.log("Threaded fn result:", data);
//     } catch (err) {
//       console.error("Fn error:", err);
//     }
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <h1 className="text-2xl font-bold">API Fetch with Threads</h1>

//       {/* Hook button */}
//       <div>
//         <button
//           onClick={fetchWithHook}
//           className="px-4 py-2 rounded bg-green-600 text-white"
//         >
//           Fetch with useThreaded Hook
//         </button>
//         {todoHook && (
//           <pre className="mt-2 p-2 bg-gray-100 rounded">
//             {JSON.stringify(todoHook, null, 2)}
//           </pre>
//         )}
//       </div>

//       {/* Threaded function button */}
//       <div>
//         <button
//           onClick={fetchWithThreadedFn}
//           className="px-4 py-2 rounded bg-blue-600 text-white"
//         >
//           Fetch with threaded() Function
//         </button>
//         {todoFn && (
//           <pre className="mt-2 p-2 bg-gray-100 rounded">
//             {JSON.stringify(todoFn, null, 2)}
//           </pre>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { useThreaded } from "../library/nextjs-threadify";
import { useState } from "react";

export default function HeavyDemo() {
  const [out, setOut] = useState<number | null>(null);

  const heavy = useThreaded((n: number) => {
    // self-contained function (no external closures)
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.sqrt(i);
    return s;
  }, []); // provide deps to recreate if needed

  return (
    <button
      onClick={async () => {
        const res = await heavy(5_000_000);
        setOut(res);
      }}
    >
      {out == null ? "Run threaded work" : `Result: ${Math.round(out)}`}
    </button>
  );
}
