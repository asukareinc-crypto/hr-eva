import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";

export default async function AdminDashboard() {
  await requireSuperAdmin();
  const [tenantCount, clientCount, userCount, evaluationCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.client.count(),
    prisma.user.count(),
    prisma.evaluation.count(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="運営ダッシュボード" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="テナント数" value={tenantCount} href="/admin/tenants" />
        <Stat label="クライアント企業" value={clientCount} />
        <Stat label="ユーザー" value={userCount} />
        <Stat label="評価レコード" value={evaluationCount} href="/admin/evaluations" />
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <Card className="p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
