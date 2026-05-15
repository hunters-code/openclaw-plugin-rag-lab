let seq = 0;
const nextId = () => `task_${++seq}_${Date.now().toString(36)}`;
export function createTaskStore(maxTasks) {
    const tasks = [];
    return {
        add(title, notes) {
            if (tasks.length >= maxTasks) {
                return { ok: false, reason: "limit", maxTasks };
            }
            const t = {
                id: nextId(),
                title: title.trim(),
                notes: (notes ?? "").trim(),
                status: "pending",
                createdAt: new Date().toISOString(),
            };
            tasks.unshift(t);
            return { ok: true, task: t };
        },
        list(filter) {
            const rows = filter === "all"
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
        complete(id) {
            const t = tasks.find((x) => x.id === id);
            if (!t)
                return { ok: false, reason: "not_found" };
            if (t.status === "done")
                return { ok: true, task: t, already: true };
            t.status = "done";
            return { ok: true, task: t };
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
