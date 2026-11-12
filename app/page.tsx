import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEvents } from "@/lib/events";
import { getSession } from "@/lib/session";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function DashboardContent() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const events = await getEvents();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Autobot Alerts
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            ClickUp → Telegram alert history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">
              Sign out ({session.email})
            </button>
          </form>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No alerts yet. They&apos;ll show up here as ClickUp sends them.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.source === "task-comment"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    }`}
                  >
                    {e.source === "task-comment" ? "Task comment" : "Chat message"}
                  </span>
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {e.author}
                  </span>
                  {!e.delivered && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Telegram delivery failed
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {timeAgo(e.timestamp)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {e.text}
              </p>
              <a
                href={`/m/${e.id}`}
                className="mr-4 mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                View →
              </a>
              {e.link && (
                <a
                  href={e.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open in ClickUp →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading alerts…</p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-dvh bg-zinc-50 font-sans dark:bg-black">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
