import type { Session } from "@/lib/session";
import Link from "next/link";
import { Avatar } from "./avatar";
import { NavLinks } from "./nav-links";

export function BrandMark() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </span>
  );
}

export function SiteHeader({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="hidden text-sm font-semibold tracking-tight text-zinc-900 sm:block dark:text-zinc-50">
              Autobot Alerts
            </span>
          </Link>
          <NavLinks />
        </div>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
            <Avatar name={session.name} picture={session.picture} size={32} />
            <span className="hidden max-w-32 truncate text-sm font-medium text-zinc-800 sm:block dark:text-zinc-200">
              {session.name}
            </span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" fill="currentColor" aria-hidden="true">
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
              <Avatar name={session.name} picture={session.picture} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{session.name}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{session.email}</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post" className="p-1.5">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
