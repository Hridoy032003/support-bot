import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEvents } from "@/lib/events";
import { getSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { AssignedTasks, AssignedTasksSkeleton } from "@/components/assigned-tasks";
import { SiteHeader } from "@/components/site-header";

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
    <>
      <SiteHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Hi, {session.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              ClickUp → Telegram alert history
            </p>
          </div>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {events.length} alert{events.length === 1 ? "" : "s"}
          </span>
        </div>

        <Suspense fallback={<AssignedTasksSkeleton />}>
          <AssignedTasks email={session.email} />
        </Suspense>

        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent alerts</h2>
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No alerts yet. They&apos;ll show up here as ClickUp sends them.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((e) => (
              <li key={e.id}>
                <a
                  href={`/m/${e.id}`}
                  className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-700"
                >
                  <Avatar name={e.author} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{e.author}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            e.source === "task-comment"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          }`}
                        >
                          {e.source === "task-comment" ? "Task comment" : "Chat message"}
                        </span>
                        {!e.delivered && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Telegram delivery failed
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{timeAgo(e.timestamp)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {e.text}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
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
