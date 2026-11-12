import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "autobot_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type Session = { email: string; name: string };

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Comma-separated Google emails allowed to sign in (ALLOWED_EMAILS). Empty = nobody.
 * "*" allows any verified Google account.
 */
export function isAllowedEmail(email: string): boolean {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes("*") || allowed.includes(email.toLowerCase());
}

export function createSessionToken(session: Session): string {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
  const body = Buffer.from(
    JSON.stringify({ ...session, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token || !process.env.AUTH_SECRET) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    // Re-check the allow-list so removing someone's email revokes their session.
    if (typeof data.email !== "string" || !isAllowedEmail(data.email)) return null;
    return { email: data.email, name: String(data.name ?? data.email) };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/** Only allow same-site relative paths as post-login redirect targets. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
