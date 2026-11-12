import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getEventById } from "@/lib/events";
import { getSession } from "@/lib/session";

async function MessageDialog({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/m/${id}`)}`);

  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Message"
    >
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                event.source === "task-comment"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              }`}
            >
              {event.source === "task-comment" ? "Task comment" : "Chat message"}
            </span>
            <p className="mt-2 text-sm font-medium text-black dark:text-zinc-50">{event.author}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(event.timestamp).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })} IST
            </p>
          </div>
          <a
            href="/"
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ×
          </a>
        </div>
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{event.text}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          {event.link ? (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
            >
              Open in ClickUp →
            </a>
          ) : (
            <span />
          )}
          <a href="/" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MessagePage(props: PageProps<"/m/[id]">) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-black">
      <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading…</p>}>
        <MessageDialog params={props.params} />
      </Suspense>
    </div>
  );
}
