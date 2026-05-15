# OpenClaw simple-tasks plugin

OpenClaw plugin with in-memory task tools (`simple_task_add`, `simple_task_list`, `simple_task_complete`, `simple_task_stats`, `simple_task_clear`).

## Layout

- `index.ts` plugin entry and tool registration
- `src/store.ts` in-memory task store

## Environment

Copy `env.example` to `.env` and fill in your keys. Optional `OPENCLAW_SIMPLE_TASKS_MAX` caps how many tasks are kept (default 200, max 10000).

## Setup

```bash
npm install
npm run build
npx --yes tsc --noEmit
```

`dist/` is committed so ClawHub source-linked installs match published `files[]` metadata.
