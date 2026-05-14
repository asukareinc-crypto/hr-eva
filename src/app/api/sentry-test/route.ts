import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token !== process.env.SENTRY_TEST_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  throw new Error("Sentry test error from /api/sentry-test (server) at " + new Date().toISOString());
}
