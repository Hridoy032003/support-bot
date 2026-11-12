import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  isAllowedEmail,
  safeNextPath,
  sessionCookieOptions,
} from "@/lib/session";
import { appOrigin } from "../route";

function fail(request: Request, reason: string) {
  const res = NextResponse.redirect(`${appOrigin(request)}/login?error=${reason}`);
  res.cookies.delete("oauth_state");
  return res;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const stored = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("oauth_state="))
    ?.slice("oauth_state=".length);
  const [expectedState, rawNext] = decodeURIComponent(stored ?? "").split("|");

  if (!code || !state || !expectedState || state !== expectedState) return fail(request, "state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${appOrigin(request)}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", tokenRes.status);
    return fail(request, "token");
  }
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return fail(request, "profile");
  const info = await infoRes.json();

  if (!info.email || info.email_verified !== true || !isAllowedEmail(info.email)) {
    return fail(request, "denied");
  }

  const res = NextResponse.redirect(`${appOrigin(request)}${safeNextPath(rawNext)}`);
  res.cookies.set(
    SESSION_COOKIE,
    createSessionToken({
      email: info.email,
      name: info.name ?? info.email,
      picture: typeof info.picture === "string" ? info.picture : undefined,
    }),
    sessionCookieOptions
  );
  res.cookies.delete("oauth_state");
  return res;
}
