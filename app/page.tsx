"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThreaded } from "../library/nextjs-threadify";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  website?: string;
}

export default function UserFetcher() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFetch, setAutoFetch] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());
  const [fetchCount, setFetchCount] = useState<number>(0);

  const fetchUsers = useThreaded(async (): Promise<User[]> => {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }, [lastFetchTime]);

  const handleFetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setLastFetchTime(Date.now());
      setFetchCount((prev) => prev + 1);
      const result = await fetchUsers();
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;
    const interval = setInterval(handleFetchUsers, 10000);
    return () => clearInterval(interval);
  }, [autoFetch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-8"
        >
          <motion.div
            key={fetchCount}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
            className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200"
          >
            <span className="text-2xl mr-3">🔄</span>
            <span className="text-lg font-semibold text-gray-700">
              Fetch Count:{" "}
              <span className="text-blue-600 font-bold">{fetchCount}</span>
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <motion.button
            onClick={handleFetchUsers}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-8 py-4 rounded-xl font-semibold text-white text-lg
              transition-all duration-200 shadow-lg
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl"
              }
            `}
          >
            <motion.span
              animate={loading ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1, repeat: loading ? Infinity : 0 }}
            >
              {loading ? "⏳ Loading..." : "🚀 Fetch Users"}
            </motion.span>
          </motion.button>

          <motion.button
            onClick={() => setAutoFetch(!autoFetch)}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-8 py-4 rounded-xl font-semibold text-white text-lg
              transition-all duration-200 shadow-lg
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : autoFetch
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-xl"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl"
              }
            `}
          >
            <motion.span
              animate={autoFetch ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: autoFetch ? Infinity : 0 }}
            >
              {autoFetch ? "⏹️ Stop Auto-Fetch" : "⏰ Auto-Fetch (10s)"}
            </motion.span>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8 shadow-lg"
            >
              <div className="flex items-center">
                <span className="text-red-500 mr-3">⚠️</span>
                <span className="font-medium">Error: {error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {users.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8"
            >
              <motion.h2
                className="text-3xl font-bold text-gray-800 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Users ({users.length})
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 100,
                      }}
                      whileHover={{
                        y: -5,
                        scale: 1.02,
                        transition: { duration: 0.2 },
                      }}
                      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.5 + index * 0.1,
                          type: "spring",
                        }}
                        className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                      >
                        {user.name.charAt(0)}
                      </motion.div>

                      <motion.h3
                        className="text-xl font-bold text-gray-800 mb-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                      >
                        {user.name}
                      </motion.h3>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center text-gray-600">
                          <span className="text-blue-500 mr-2">📧</span>
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="text-green-500 mr-2">📞</span>
                          <span className="text-sm">{user.phone || "N/A"}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="text-purple-500 mr-2">🌐</span>
                          <span className="text-sm">
                            {user.website || "N/A"}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
