"use client";

import * as React from "react";
import type { PomodoroSettings, Task, TimerMode } from "@/lib/types";
import { defaultSettings, sampleTasks } from "@/data/defaults";

function minutesToSeconds(m: number) {
  return Math.max(0, Math.floor(m * 60));
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.06;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    window.setTimeout(() => {
      o.stop();
      ctx.close();
    }, 300);
  } catch {
    // puede bloquearse si el navegador no permite audio sin interacción
  }
}

/**
 * Devuelve la siguiente tarea pendiente (no completada) según el ORDEN ACTUAL de la lista.
 * - Primero busca después de la actual.
 * - Si no hay, vuelve al principio.
 */
function pickNextActiveTask(currentId: string, list: Task[]) {
  const currentIndex = list.findIndex((t) => t.id === currentId);

  for (let i = currentIndex + 1; i < list.length; i++) {
    if (!list[i].completed) return list[i].id;
  }

  for (let i = 0; i < list.length; i++) {
    if (!list[i].completed) return list[i].id;
  }

  return "";
}

export default function Home() {
  // SETTINGS
  const [settings, setSettings] = React.useState<PomodoroSettings>(defaultSettings);
  const [autoStart, setAutoStart] = React.useState(true);

  // TASKS (el orden del array = orden real)
  const [tasks, setTasks] = React.useState<Task[]>(sampleTasks);
  const [activeTaskId, setActiveTaskId] = React.useState<string>(sampleTasks[0]?.id ?? "");

  // TIMER
  const [mode, setMode] = React.useState<TimerMode>("focus");
  const [cycleCount, setCycleCount] = React.useState<number>(0);
  const [running, setRunning] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(minutesToSeconds(settings.focusMinutes));

  // NEW TASK FORM
  const [newTitle, setNewTitle] = React.useState("");
  const [newEstimate, setNewEstimate] = React.useState<number>(60);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  function modeDurationMinutes(m: TimerMode) {
    if (m === "focus") return settings.focusMinutes;
    if (m === "break") return settings.breakMinutes;
    return settings.longBreakMinutes;
  }

  function resetToMode(nextMode: TimerMode) {
    setMode(nextMode);
    setSecondsLeft(minutesToSeconds(modeDurationMinutes(nextMode)));
    setRunning(false);
  }

  // Reordenar (↑ / ↓)
  function moveTask(id: string, direction: "up" | "down") {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;

      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  }

  // Tick: decrementa el timer + si estamos en focus, suma 1 segundo de trabajo a la tarea activa
  React.useEffect(() => {
    if (!running) return;

    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));

      // ✅ progreso "real" durante focus: 1s = 1/60 min
      if (mode === "focus" && activeTaskId) {
        setTasks((prev) => {
          const next = prev.map((t) => {
            if (t.id !== activeTaskId) return t;

            const workedMinutes = t.workedMinutes + 1 / 60;
            const completed = workedMinutes >= t.estimateMinutes;

            return { ...t, workedMinutes, completed };
          });

          // Si se completó "a mitad del focus", activar la siguiente pendiente
          const justCompleted = next.find((t) => t.id === activeTaskId)?.completed;
          if (justCompleted) {
            const nextId = pickNextActiveTask(activeTaskId, next);
            setActiveTaskId(nextId);
          }

          return next;
        });
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [running, mode, activeTaskId]);

  // Finish: cuando el contador llega a 0, sonar y pasar de fase automáticamente
  React.useEffect(() => {
  if (!running) return;

  const id = window.setInterval(() => {
    setSecondsLeft((s) => Math.max(0, s - 1));

    if (mode === "focus" && activeTaskId) {
      setTasks((prev) => {
        const next = prev.map((t) => {
          if (t.id !== activeTaskId) return t;

          const workedMinutes = t.workedMinutes + 1 / 60;
          const completed = workedMinutes >= t.estimateMinutes;

          return { ...t, workedMinutes, completed };
        });

        const justCompleted = next.find((t) => t.id === activeTaskId)?.completed;
        if (justCompleted) {
          const nextId = pickNextActiveTask(activeTaskId, next);
          setActiveTaskId(nextId);
        }

        return next;
      });
    }
  }, 1000);

  return () => window.clearInterval(id);
}, [running, mode, activeTaskId]); // ✅ SIEMPRE 3 elementos, siempre

  const title = mode === "focus" ? "Focus" : mode === "break" ? "Descanso" : "Descanso largo";

  // SETTINGS handlers
  function updateSetting<K extends keyof PomodoroSettings>(key: K, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function applySettings() {
    setRunning(false);
    setSecondsLeft(minutesToSeconds(modeDurationMinutes(mode)));
  }

  // TASK handlers
  function addTask() {
    const title = newTitle.trim();
    if (!title) return;

    const estimate = clampInt(newEstimate, 1, 24 * 60);
    const task: Task = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      title,
      estimateMinutes: estimate,
      workedMinutes: 0,
      completed: false,
      createdAt: Date.now(),
    };

    // ✅ orden por creación (FIFO): añadimos al FINAL
    setTasks((prev) => [...prev, task]);
    setActiveTaskId(task.id);

    setNewTitle("");
    setNewEstimate(60);
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (activeTaskId === id) {
      const remaining = tasks.filter((t) => t.id !== id);
      const nextId = remaining.find((t) => !t.completed)?.id ?? remaining[0]?.id ?? "";
      setActiveTaskId(nextId);
    }
  }

  function toggleComplete(id: string) {
    // Calculamos cómo quedaría y si era la activa, activamos la siguiente
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));

      if (id === activeTaskId) {
        const nowCompleted = next.find((t) => t.id === id)?.completed;
        if (nowCompleted) {
          const nextId = pickNextActiveTask(id, next);
          setActiveTaskId(nextId);
        }
      }

      return next;
    });
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FocusFlow</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pomodoro configurable + tareas por minutos trabajados (progreso real por segundo).
            </p>
          </div>

          <div className="text-right text-sm text-muted-foreground">
            <div>Modo: {title}</div>
            <div>Focus: {settings.focusMinutes} min</div>
            <div>Descanso: {settings.breakMinutes} min</div>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {/* Pomodoro */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pomodoro</h2>
              <span className="text-sm text-muted-foreground">Ciclos focus: {cycleCount}</span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">{title}</p>

            <div className="mt-6 text-5xl font-semibold tabular-nums">{formatMMSS(secondsLeft)}</div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {running ? "Pause" : "Start"}
              </button>

              <button onClick={() => resetToMode(mode)} className="rounded-lg border px-4 py-2 text-sm font-medium">
                Reset
              </button>

              <button onClick={() => resetToMode("focus")} className="rounded-lg border px-4 py-2 text-sm font-medium">
                Focus
              </button>

              <button onClick={() => resetToMode("break")} className="rounded-lg border px-4 py-2 text-sm font-medium">
                Descanso
              </button>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} />
              Auto-start (cambio automático)
            </label>
          </div>

          {/* Config */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Configuración</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cambia los tiempos y aplica.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Focus (min)
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={settings.focusMinutes}
                  onChange={(e) => updateSetting("focusMinutes", clampInt(Number(e.target.value), 1, 180))}
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                Descanso (min)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.breakMinutes}
                  onChange={(e) => updateSetting("breakMinutes", clampInt(Number(e.target.value), 1, 60))}
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                Largo (min)
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.longBreakMinutes}
                  onChange={(e) => updateSetting("longBreakMinutes", clampInt(Number(e.target.value), 1, 120))}
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                Largo cada…
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={settings.longBreakEvery}
                  onChange={(e) => updateSetting("longBreakEvery", clampInt(Number(e.target.value), 2, 10))}
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={applySettings}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Aplicar
              </button>

              <button
                onClick={() => {
                  setSettings(defaultSettings);
                  setRunning(false);
                  setMode("focus");
                  setCycleCount(0);
                  setSecondsLeft(minutesToSeconds(defaultSettings.focusMinutes));
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Reset settings
              </button>
            </div>
          </div>

          {/* Tasks */}
          <div className="rounded-2xl border bg-card p-5 md:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Tareas</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orden manual (↑↓) y progreso real por segundo durante focus.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nueva tarea…"
                  className="w-64 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={newEstimate}
                  onChange={(e) => setNewEstimate(clampInt(Number(e.target.value), 1, 1440))}
                  className="w-28 rounded-lg border bg-background px-3 py-2 text-sm"
                  title="Minutos estimados"
                />
                <button onClick={addTask} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Añadir
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {tasks.map((t) => {
                const pct = Math.min(100, (t.workedMinutes / t.estimateMinutes) * 100);
                const isActive = t.id === activeTaskId;

                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-4 ${isActive ? "border-primary/50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          {t.completed ? (
                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              Completada
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.floor(t.workedMinutes)}/{t.estimateMinutes} min
                        </p>

                        <div className="mt-3 h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {/* Reordenar */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveTask(t.id, "up")}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                            aria-label="Subir tarea"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveTask(t.id, "down")}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                            aria-label="Bajar tarea"
                          >
                            ↓
                          </button>
                        </div>

                        <button
                          onClick={() => setActiveTaskId(t.id)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        >
                          {isActive ? "Activa" : "Activar"}
                        </button>

                        <button
                          onClick={() => toggleComplete(t.id)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        >
                          {t.completed ? "Reabrir" : "Completar"}
                        </button>

                        <button
                          onClick={() => deleteTask(t.id)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {tasks.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No hay tareas aún.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
