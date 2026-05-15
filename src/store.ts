export type SimpleTask = {
  id: string;
  title: string;
  notes: string;
  status: "pending" | "done";
  createdAt: string;
};

let seq = 0;
const nextId = () => `task_${++seq}_${Date.now().toString(36)}`;

export function createTaskStore(maxTasks: number) {
  const tasks: SimpleTask[] = [];

  return {
    add(title: string, notes: string | undefined) {
      if (tasks.length >= maxTasks) {
        return { ok: false as const, reason: "limit" as const, maxTasks };
      }
      const t: SimpleTask = {
        id: nextId(),
        title: title.trim(),
        notes: (notes ?? "").trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      tasks.unshift(t);
      return { ok: true as const, task: t };
    },
    list(filter: "all" | "pending" | "done") {
      const rows =
        filter === "all"
          ? tasks
          : tasks.filter((x) => x.status === filter);
      return {
        tasks: rows.map((x) => ({
          id: x.id,
          title: x.title,
          notes: x.notes || undefined,
          status: x.status,
          createdAt: x.createdAt,
        })),
        total: tasks.length,
      };
    },
    complete(id: string) {
      const t = tasks.find((x) => x.id === id);
      if (!t) return { ok: false as const, reason: "not_found" as const };
      if (t.status === "done") return { ok: true as const, task: t, already: true as const };
      t.status = "done";
      return { ok: true as const, task: t };
    },
    clear() {
      const n = tasks.length;
      tasks.length = 0;
      return { removed: n };
    },
    stats() {
      const pending = tasks.filter((x) => x.status === "pending").length;
      const done = tasks.filter((x) => x.status === "done").length;
      return { total: tasks.length, pending, done, maxTasks };
    },
  };
}

export type TaskStore = ReturnType<typeof createTaskStore>;
