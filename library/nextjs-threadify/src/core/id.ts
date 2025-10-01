// Simple monotonically increasing task id generator

let __taskCounter = 0;
export const nextTaskId = () => ++__taskCounter;
