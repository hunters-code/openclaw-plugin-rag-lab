import { Type } from "@sinclair/typebox";
import { createOrbitSdk, getAnyEnvOrPrompt } from "@orbit-0g/sdk";
import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { createTaskStore } from "./src/store.js";
const maxTasks = (() => {
    const raw = process.env.OPENCLAW_SIMPLE_TASKS_MAX;
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0)
        return Math.min(10_000, n);
    return 200;
})();
const store = createTaskStore(maxTasks);
const sdk = createOrbitSdk(null);
let installed = false;
async function getPluginId() {
    return getAnyEnvOrPrompt({
        envKeys: ["ORBIT_PLUGIN_ID", "PLUGIN_KEY", "OPENCLAW_PLUGIN_KEY"],
        promptMessage: "Enter Orbit plugin id (bytes32 hex)",
        validate: (value) => value.startsWith("0x") && value.length === 66
            ? true
            : "Expected bytes32 hex (0x + 64 hex chars)",
    });
}
async function ensureInstalled() {
    if (installed)
        return;
    const pluginId = await getPluginId();
    await sdk.billing.recordInstall(pluginId);
    installed = true;
}
async function billUsage(toolName) {
    const pluginId = await getPluginId();
    await sdk.billing.recordUsage(pluginId, toolName);
}
const simpleTaskAddParams = Type.Object({
    title: Type.String({ description: "Judul tugas singkat" }),
    notes: Type.Optional(Type.String({ description: "Catatan opsional" })),
});
const simpleTaskListParams = Type.Object({
    filter: Type.Optional(Type.Union([
        Type.Literal("all"),
        Type.Literal("pending"),
        Type.Literal("done"),
    ], { default: "pending", description: "Yang ditampilkan" })),
});
const simpleTaskCompleteParams = Type.Object({
    task_id: Type.String({ description: "ID tugas dari simple_task_list" }),
});
const simpleTaskStatsParams = Type.Object({});
const simpleTaskClearParams = Type.Object({
    confirm: Type.Literal("yes"),
});
export default definePluginEntry({
    id: "simple-tasks",
    name: "Tugas sederhana",
    description: "Daftar tugas ringan in-memory per proses gateway: tambah, lihat, selesai",
    register(api) {
        api.registerTool({
            name: "simple_task_add",
            label: "Tambah tugas",
            description: "Menyimpan satu tugas baru (pending) di memori gateway",
            parameters: simpleTaskAddParams,
            async execute(_id, params) {
                try {
                    await ensureInstalled();
                    await billUsage("simple_task_add");
                    const p = params;
                    const title = p.title.trim();
                    if (!title) {
                        return jsonResult({ ok: false, reason: "title_empty" });
                    }
                    return jsonResult(store.add(title, p.notes));
                }
                catch (err) {
                    return jsonResult({ ok: false, reason: "billing_failed", error: String(err) });
                }
            },
        });
        api.registerTool({
            name: "simple_task_list",
            label: "Daftar tugas",
            description: "Mengembalikan tugas sesuai filter (default: yang masih pending)",
            parameters: simpleTaskListParams,
            async execute(_id, params) {
                try {
                    await ensureInstalled();
                    await billUsage("simple_task_list");
                    const p = params;
                    const filter = p.filter ?? "pending";
                    return jsonResult(store.list(filter));
                }
                catch (err) {
                    return jsonResult({ ok: false, reason: "billing_failed", error: String(err) });
                }
            },
        });
        api.registerTool({
            name: "simple_task_complete",
            label: "Tandai selesai",
            description: "Menandai satu tugas sebagai selesai berdasarkan task_id",
            parameters: simpleTaskCompleteParams,
            async execute(_id, params) {
                try {
                    await ensureInstalled();
                    await billUsage("simple_task_complete");
                    const p = params;
                    return jsonResult(store.complete(p.task_id.trim()));
                }
                catch (err) {
                    return jsonResult({ ok: false, reason: "billing_failed", error: String(err) });
                }
            },
        });
        api.registerTool({
            name: "simple_task_stats",
            label: "Ringkasan tugas",
            description: "Jumlah total, pending, selesai, dan batas penyimpanan",
            parameters: simpleTaskStatsParams,
            async execute(_id, _params) {
                try {
                    await ensureInstalled();
                    await billUsage("simple_task_stats");
                    return jsonResult(store.stats());
                }
                catch (err) {
                    return jsonResult({ ok: false, reason: "billing_failed", error: String(err) });
                }
            },
        });
        api.registerTool({
            name: "simple_task_clear",
            label: "Hapus semua tugas",
            description: "Mengosongkan seluruh daftar tugas untuk proses ini",
            parameters: simpleTaskClearParams,
            async execute(_id, params) {
                try {
                    await ensureInstalled();
                    await billUsage("simple_task_clear");
                    const p = params;
                    if (p.confirm !== "yes") {
                        return jsonResult({ ok: false, reason: "confirm" });
                    }
                    return jsonResult({ ok: true, ...store.clear() });
                }
                catch (err) {
                    return jsonResult({ ok: false, reason: "billing_failed", error: String(err) });
                }
            },
        }, { optional: true });
    },
});
