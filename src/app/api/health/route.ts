import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ヘルスチェックエンドポイント。
 * Vercel の cron や外部監視（UptimeRobot等）から定期的に呼び出して使う想定。
 *
 * - DB 疎通確認（軽量クエリ）
 * - レスポンスは JSON
 */
export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "error" = "ok";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    db = "error";
    dbError = String(e);
  }
  const latencyMs = Date.now() - startedAt;

  const ok = db === "ok";
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      timestamp: new Date().toISOString(),
      checks: { db: { status: db, error: dbError, latencyMs } },
    },
    { status: ok ? 200 : 503 }
  );
}
