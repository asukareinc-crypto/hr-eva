import { requireSr } from "@/lib/guards";
import { Shell } from "@/components/Shell";

export default async function SrLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSr();
  return (
    <Shell
      title="社労士コンソール"
      subtitle="SR ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
      nav={[
        { href: "/sr", label: "ダッシュボード", icon: "📊" },
        { href: "/sr/clients", label: "クライアント企業", icon: "🏢" },
        { href: "/sr/templates", label: "評価制度", icon: "📝" },
        { href: "/sr/periods", label: "評価期間", icon: "📅" },
        { href: "/sr/grades", label: "等級表", icon: "🪜" },
        { href: "/sr/settings/api-keys", label: "API キー", icon: "🔑" },
      ]}
    >
      {children}
    </Shell>
  );
}
