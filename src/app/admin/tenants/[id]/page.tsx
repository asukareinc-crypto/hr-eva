import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Badge, Btn, Field, Input } from "@/components/ui";
import { updateTenant } from "@/app/admin/actions";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSuperAdmin();
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { where: { role: "SR_ADMIN" } },
      clients: true,
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={tenant.name}
        actions={<Link href="/admin/tenants" className="text-sm text-slate-600 underline-offset-2 hover:underline">← 一覧へ</Link>}
      />

      <Card className="p-6 max-w-xl">
        <form
          action={async (fd) => {
            "use server";
            await updateTenant(id, fd);
          }}
          className="space-y-4"
        >
          <Field label="名称"><Input name="name" defaultValue={tenant.name} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={tenant.isActive} />
            稼働中
          </label>
          <Btn type="submit">保存</Btn>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2 text-sm">社労士ユーザー</h2>
        {tenant.users.length === 0 ? (
          <div className="text-sm text-slate-500">なし</div>
        ) : (
          <ul className="text-sm space-y-1">
            {tenant.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span>{u.name} <span className="text-slate-500">({u.email})</span></span>
                <Badge tone={u.isActive ? "green" : "slate"}>
                  {u.isActive ? "有効" : "無効"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2 text-sm">クライアント企業</h2>
        {tenant.clients.length === 0 ? (
          <div className="text-sm text-slate-500">なし</div>
        ) : (
          <ul className="text-sm space-y-1">
            {tenant.clients.map((c) => (
              <li key={c.id}>・{c.name}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
