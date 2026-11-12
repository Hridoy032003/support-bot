import { Suspense } from "react";

const ERRORS: Record<string, string> = {
  denied: "That Google account isn't allowed to view this dashboard.",
  state: "Sign-in expired. Please try again.",
  token: "Google sign-in failed. Please try again.",
  profile: "Couldn't read your Google profile. Please try again.",
};

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error } = await searchParams;
  return error ? (
    <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
      {ERRORS[error] ?? "Sign-in failed."}
    </p>
  ) : null;
}

async function SignInLink({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a
      href={href}
      className="block rounded-lg bg-black px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
    >
      Continue with Google
    </a>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold text-black dark:text-zinc-50">Autobot Alerts</h1>
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">Sign in with your team Google account.</p>
        <Suspense>
          <LoginError searchParams={props.searchParams} />
        </Suspense>
        <Suspense>
          <SignInLink searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
