import { Suspense } from "react";
import { GoogleIcon } from "@/components/google-icon";
import { BrandMark } from "@/components/site-header";

const ERRORS: Record<string, string> = {
  denied: "That Google account isn't allowed to view this dashboard.",
  state: "Sign-in expired. Please try again.",
  token: "Google sign-in failed. Please try again.",
  profile: "Couldn't read your Google profile. Please try again.",
};

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return error ? (
    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
      {ERRORS[error] ?? "Sign-in failed."}
    </p>
  ) : null;
}

async function SignInButton({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      <GoogleIcon />
      Sign in with Google
    </a>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-indigo-50 via-zinc-50 to-zinc-50 px-4 dark:from-zinc-900 dark:via-black dark:to-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl shadow-indigo-500/5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to Autobot Alerts
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to view your team&apos;s ClickUp alerts.
          </p>
        </div>
        <Suspense>
          <LoginError searchParams={props.searchParams} />
        </Suspense>
        <Suspense>
          <SignInButton searchParams={props.searchParams} />
        </Suspense>
      </div>
      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
        Only approved Google accounts can sign in.
      </p>
    </div>
  );
}
