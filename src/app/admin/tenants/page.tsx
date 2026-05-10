import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Empty, LinkBtn } from "@/components/ui";

export default async function AdminTenantsPage() {
  await requireSuperAdmin();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, clients: true } },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="社労士テナント"
        actions={<LinkBtn href="/admin/tenants/new">+ 新規作成</LinkBtn>}
      />

      {tenants.length === 0 ? (
        <Empty message="テナントがまだありません" />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-4 py-2">テナント名</th>
                <th className="text-left px-4 py-2">ユーザー</th>
                <th className="text-left px-4 py-2">クライアント</th>
                <th className="text-left px-4 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium">
                    <Link className="hover:underline" href={`/admin/tenants/${t.id}`}>
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{t._count.users}</td>
                  <td className="px-4 py-2">{t._count.clients}</td>
                  <td className="px-4 py-2">
                    {t.isActive ? <Badge tone="green">稼働中</Badge> : <Badge tone="slate">停止</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
