import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEvents } from "@/lib/events";
import { getSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import {
  AssignedTasks,
  AssignedTasksSkeleton,
} from "@/components/assigned-tasks";
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

const istDay = (d: Date | string | number) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const todayIst = () => istDay(Date.now());

function greeting(): string {
  const hour = Number(
    new Date().toLocaleString("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }),
  );
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${
          tone === "danger" && value > 0
            ? "text-red-600 dark:text-red-400"
            : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  );
}

async function DashboardContent() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const events = await getEvents();

  const today = todayIst();
  const todayCount = events.filter((e) => istDay(e.timestamp) === today).length;
  const chatCount = events.filter((e) => e.source === "chat-message").length;
  const failedCount = events.filter((e) => !e.delivered).length;

  return (
    <>
      <SiteHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {greeting()}, {session.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Here&apos;s what&apos;s happening across ClickUp and Telegram.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total alerts"
            value={events.length}
            hint="Last 200 kept"
          />
          <StatCard label="Today" value={todayCount} hint="IST" />
          <StatCard
            label="Chat messages"
            value={chatCount}
            hint={`${events.length - chatCount} task comments`}
          />
          <StatCard
            label="Delivery issues"
            value={failedCount}
            hint="Not sent to Telegram"
            tone="danger"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Recent alerts
            </h2>
            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                No alerts yet. They&apos;ll show up here as ClickUp sends them.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
                {events.map((e) => (
                  <li key={e.id}>
                    <a
                      href={`/m/${e.id}`}
                      className="flex gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    >
                      <Avatar name={e.author} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {e.author}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                                e.source === "task-comment"
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800"
                                  : "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800"
                              }`}
                            >
                              {e.source === "task-comment"
                                ? "Task comment"
                                : "Chat"}
                            </span>
                            {!e.delivered && (
                              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800">
                                Not delivered
                              </span>
                            )}
                          </div>
                          <time
                            dateTime={e.timestamp}
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            {timeAgo(e.timestamp)}
                          </time>
                        </div>
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                          {e.text}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Suspense fallback={<AssignedTasksSkeleton />}>
              <AssignedTasks email={session.email} />
            </Suspense>
          </aside>
        </div>
      </main>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading dashboard…
      </p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
