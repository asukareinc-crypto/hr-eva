import { requireClientAdmin } from "@/lib/guards";
import { Shell } from "@/components/Shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClientAdmin();
  return (
    <Shell
      title="クライアント管理"
      subtitle="CLIENT ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
      nav={[
        { href: "/client", label: "ダッシュボード", icon: "📊" },
        { href: "/client/employees", label: "従業員", icon: "👥" },
        { href: "/client/periods", label: "評価期間", icon: "📅" },
        { href: "/client/pulse", label: "パルス", icon: "📋" },
        { href: "/client/wage", label: "賃金", icon: "💴" },
        { href: "/client/leave", label: "有給", icon: "🏖️" },
        { href: "/client/settings/api-keys", label: "通知連携", icon: "🔔" },
      ]}
    >
      {children}
    </Shell>
  );
}
