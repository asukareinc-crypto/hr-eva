import { requireEmployee } from "@/lib/guards";
import { Shell } from "@/components/Shell";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await requireEmployee();
  return (
    <Shell
      variant="mobile"
      title="マイページ"
      subtitle="HR EVA"
      user={{ name: session.user.name, email: session.user.email }}
      nav={[
        { href: "/m", label: "ホーム", icon: "🏠" },
        { href: "/m/evaluations", label: "評価", icon: "📝" },
        { href: "/m/pulse", label: "パルス", icon: "📋" },
        { href: "/m/history", label: "履歴", icon: "📊" },
        { href: "/m/wage", label: "賃金", icon: "💴" },
        { href: "/m/leave", label: "有給", icon: "🏖️" },
      ]}
    >
      {children}
    </Shell>
  );
}
