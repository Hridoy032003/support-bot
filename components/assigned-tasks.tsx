import Link from "next/link";
import { getAssignedTasks, type AssignedTask } from "@/lib/clickup";
import { dueDayDiff } from "@/lib/task-filters";

const MAX_SHOWN = 8;

function dueInfo(dueMs: number | null): { label: string; tone: "overdue" | "soon" | "normal" } | null {
  if (dueMs === null) return null;
  const diff = dueDayDiff(dueMs);
  if (diff < 0) return { label: `Overdue ${-diff}d`, tone: "overdue" };
  if (diff === 0) return { label: "Due today", tone: "soon" };
  if (diff === 1) return { label: "Due tomorrow", tone: "soon" };
  return {
    label: `Due ${new Date(dueMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`,
    tone: "normal",
  };
}

const TONE: Record<string, string> = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  normal: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export function TaskRow({ task }: { task: AssignedTask }) {
  const due = dueInfo(task.dueMs);
  return (
    <li>
      <a
        href={task.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: task.statusColor }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{task.name}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {[task.list, task.status].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {due && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[due.tone]}`}>{due.label}</span>
          )}
          {task.priority && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white"
              style={{ backgroundColor: task.priorityColor ?? "#6b7280" }}
            >
              {task.priority}
            </span>
          )}
        </div>
      </a>
    </li>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}

export async function AssignedTasks({ email }: { email: string }) {
  const result = await getAssignedTasks(email);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Assigned to me</h2>
        <div className="flex items-center gap-3">
          {result.kind === "ok" && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {result.tasks.length} open
            </span>
          )}
          <Link href="/tasks" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            View all &amp; filter →
          </Link>
        </div>
      </div>

      {result.kind === "not-configured" && (
        <Notice>ClickUp isn&apos;t configured (missing API token or team ID).</Notice>
      )}
      {result.kind === "error" && <Notice>Couldn&apos;t load your tasks from ClickUp. Try refreshing.</Notice>}
      {result.kind === "no-match" && (
        <Notice>
          No ClickUp account found for {email}. Sign in with the same email you use in ClickUp.
        </Notice>
      )}
      {result.kind === "ok" &&
        (result.tasks.length === 0 ? (
          <Notice>Nothing assigned to you right now 🎉</Notice>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {result.tasks.slice(0, MAX_SHOWN).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
            {result.tasks.length > MAX_SHOWN && (
              <p className="border-t border-zinc-100 px-4 py-2.5 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                +{result.tasks.length - MAX_SHOWN} more in ClickUp
              </p>
            )}
          </>
        ))}
    </section>
  );
}

export function AssignedTasksSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
        Assigned to me
      </div>
      <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading your tasks…</p>
    </section>
  );
}
