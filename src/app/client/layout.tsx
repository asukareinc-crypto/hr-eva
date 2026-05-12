import { requireClientAdmin } from "@/lib/guards";
import { Shell, type NavItem } from "@/components/Shell";
import { getClientFeatures } from "@/lib/client-features";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClientAdmin();
  const features = await getClientFeatures(session.user.clientId);

  const nav: NavItem[] = [
    { href: "/client", label: "ダッシュボード", icon: "📊" },
    { href: "/client/employees", label: "従業員", icon: "👥" },
    { href: "/client/templates", label: "評価制度", icon: "📝" },
    { href: "/client/periods", label: "評価期間", icon: "📅" },
    { href: "/client/pulse", label: "パルス", icon: "📋" },
  ];
  if (features.wageEnabled) nav.push({ href: "/client/wage", label: "賃金", icon: "💴" });
  if (features.leaveEnabled) nav.push({ href: "/client/leave", label: "有給", icon: "🏖️" });
  nav.push({ href: "/client/settings/api-keys", label: "通知連携", icon: "🔔" });
  nav.push({ href: "/client/settings/features", label: "機能設定", icon: "⚙️" });

  return (
    <Shell
      title="クライアント管理"
      subtitle="CLIENT ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
      nav={nav}
    >
      {children}
    </Shell>
  );
}
