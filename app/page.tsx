"use client";

import * as React from "react";
import type { Task } from "@/lib/types";
import { defaultSettings, sampleTasks } from "@/data/defaults";

export default function Home() {
  const [tasks] = React.useState<Task[]>(sampleTasks);
  const [activeTaskId, setActiveTaskId] = React.useState<string>(tasks[0]?.id ?? "");

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FocusFlow</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pomodoro configurable + tareas por minutos trabajados.
            </p>
          </div>

          <div className="text-right text-sm text-muted-foreground">
            <div>Focus: {defaultSettings.focusMinutes} min</div>
            <div>Descanso: {defaultSettings.breakMinutes} min</div>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {/* Pomodoro card (placeholder por ahora) */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Pomodoro</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              (Luego metemos start/pause/reset y configuración)
            </p>

            <div className="mt-6 text-5xl font-semibold tabular-nums">
              25:00
            </div>

            <div className="mt-6 flex gap-2">
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Start
              </button>
              <button className="rounded-lg border px-4 py-2 text-sm font-medium">
                Reset
              </button>
            </div>
          </div>

          {/* Active task card */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Tarea activa</h2>

            {activeTask ? (
              <>
                <p className="mt-2 text-sm font-medium">{activeTask.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTask.workedMinutes} / {activeTask.estimateMinutes} min trabajados
                </p>

                <div className="mt-4 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        (activeTask.workedMinutes / activeTask.estimateMinutes) * 100
                      )}%`,
                    }}
                  />
                </div>

                <label className="mt-6 block text-sm font-medium">
                  Cambiar tarea activa
                  <select
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={activeTaskId}
                    onChange={(e) => setActiveTaskId(e.target.value)}
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No hay tarea activa.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
