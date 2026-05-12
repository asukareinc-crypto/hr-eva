import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * メール + パスワードに一致する全アカウントを返す（ログイン前のディスアンビギュエーション用）。
 * 同一メールアドレスで社労士・クライアント・従業員等の複数ロールを持つユーザー向け。
 *
 * 入力: { email, password }
 * 出力: { matches: Array<{ id, name, email, role, tenantName, clientName, employeeName }> }
 *
 * ※パスワードを検証してから結果を返すので、メール総当たり調査には使えない（同パスワードのレコードのみ可視）。
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ matches: [] });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return NextResponse.json({ matches: [] });

  const users = await prisma.user.findMany({
    where: { email, isActive: true },
    include: {
      tenant: { select: { name: true } },
      client: { select: { name: true } },
      employee: { select: { lastName: true, firstName: true } },
    },
  });

  const matches: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    tenantName: string | null;
    clientName: string | null;
    employeeName: string | null;
  }> = [];

  for (const u of users) {
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) continue;
    matches.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantName: u.tenant?.name ?? null,
      clientName: u.client?.name ?? null,
      employeeName: u.employee ? `${u.employee.lastName} ${u.employee.firstName}` : null,
    });
  }

  return NextResponse.json({ matches });
}
