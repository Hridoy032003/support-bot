import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Notice, TaskRow } from "@/components/assigned-tasks";
import { SiteHeader } from "@/components/site-header";
import { getAssignedTasks } from "@/lib/clickup";
import { getSession } from "@/lib/session";
import {
  DUE_FILTERS,
  applyTaskFilters,
  distinct,
  hasActiveFilters,
  parseTaskFilters,
  tasksHref,
} from "@/lib/task-filters";

const PRIORITY_ORDER = ["urgent", "high", "normal", "low", "none"];

const selectClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

async function TasksContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent("/tasks")}`);

  const filters = parseTaskFilters(await searchParams);
  const result = await getAssignedTasks(session.email);

  const allTasks = result.kind === "ok" ? result.tasks : [];
  const shown = applyTaskFilters(allTasks, filters);
  const statuses = distinct(allTasks.map((t) => t.status));
  const lists = distinct(allTasks.map((t) => t.list));
  const priorities = PRIORITY_ORDER.filter((p) => allTasks.some((t) => (t.priority ?? "none") === p));

  return (
    <>
      <SiteHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">My tasks</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Open ClickUp tasks assigned to you</p>
          </div>
          {result.kind === "ok" && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              Showing {shown.length} of {allTasks.length}
            </span>
          )}
        </div>

        {result.kind === "ok" && (
          <form method="get" action="/tasks" className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Due date">
              {DUE_FILTERS.map((f) => {
                const active = filters.due === f.value;
                return (
                  <Link
                    key={f.value}
                    href={tasksHref(filters, { due: f.value })}
                    aria-current={active ? "true" : undefined}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>

            {filters.due !== "all" && <input type="hidden" name="due" value={filters.due} />}
            <div className="grid gap-3 sm:grid-cols-4">
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Search tasks…"
                aria-label="Search tasks"
                className={`${selectClass} sm:col-span-4`}
              />
              <select name="status" defaultValue={filters.status} aria-label="Status" className={selectClass}>
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select name="priority" defaultValue={filters.priority} aria-label="Priority" className={selectClass}>
                <option value="">All priorities</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>{p === "none" ? "No priority" : p}</option>
                ))}
              </select>
              <select name="list" defaultValue={filters.list} aria-label="List" className={`${selectClass} sm:col-span-2`}>
                <option value="">All lists</option>
                {lists.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Apply filters
              </button>
              {hasActiveFilters(filters) && (
                <Link href="/tasks" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
                  Clear all
                </Link>
              )}
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {result.kind === "not-configured" && <Notice>ClickUp isn&apos;t configured (missing API token or team ID).</Notice>}
          {result.kind === "error" && <Notice>Couldn&apos;t load your tasks from ClickUp. Try refreshing.</Notice>}
          {result.kind === "no-match" && (
            <Notice>No ClickUp account found for {session.email}. Sign in with the same email you use in ClickUp.</Notice>
          )}
          {result.kind === "ok" &&
            (shown.length === 0 ? (
              <Notice>
                {allTasks.length === 0 ? "Nothing assigned to you right now 🎉" : "No tasks match these filters."}
              </Notice>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {shown.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            ))}
        </section>
      </main>
    </>
  );
}

export default function TasksPage(props: PageProps<"/tasks">) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-black">
      <Suspense fallback={<p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading your tasks…</p>}>
        <TasksContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
