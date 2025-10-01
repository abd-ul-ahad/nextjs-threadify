// Core environment guards and constants

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"
export const hasWorker = isBrowser && typeof Worker !== "undefined"
