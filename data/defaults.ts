import type { PomodoroSettings, Task } from "@/lib/types";

export const defaultSettings: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

export const sampleTasks: Task[] = [
  {
    id: "t1",
    title: "Montar UI base",
    estimateMinutes: 90,
    workedMinutes: 0,
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: "t2",
    title: "Pomodoro + lógica de progreso",
    estimateMinutes: 120,
    workedMinutes: 25,
    completed: false,
    createdAt: Date.now(),
  },
];
