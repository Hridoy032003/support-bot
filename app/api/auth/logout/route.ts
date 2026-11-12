import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { appOrigin } from "../google/route";

export async function POST(request: Request) {
  const res = NextResponse.redirect(`${appOrigin(request)}/login`, { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
