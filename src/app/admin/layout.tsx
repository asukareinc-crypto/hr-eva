import { requireSuperAdmin } from "@/lib/guards";
import { Shell } from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <Shell
      title="運営管理"
      subtitle="SUPER ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
      nav={[
        { href: "/admin", label: "ダッシュボード", icon: "📊" },
        { href: "/admin/tenants", label: "社労士テナント", icon: "🏢" },
      ]}
    >
      {children}
    </Shell>
  );
}
