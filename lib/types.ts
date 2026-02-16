export type Task = {
  id: string;
  title: string;
  estimateMinutes: number; // ej. 90
  workedMinutes: number;   // ej. 25
  completed: boolean;
  createdAt: number;
};

export type TimerMode = "focus" | "break" | "longBreak";

export type PomodoroSettings = {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number; // cada cuántos focus
};
