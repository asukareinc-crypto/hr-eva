import { requireEmployee } from "@/lib/guards";
import { Shell, type NavItem } from "@/components/Shell";
import { getClientFeatures } from "@/lib/client-features";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await requireEmployee();
  const features = await getClientFeatures(session.user.clientId);

  const nav: NavItem[] = [
    { href: "/m", label: "ホーム", icon: "🏠" },
    { href: "/m/evaluations", label: "評価", icon: "📝" },
    { href: "/m/pulse", label: "パルス", icon: "📋" },
    { href: "/m/history", label: "履歴", icon: "📊" },
  ];
  if (features.wageEnabled) nav.push({ href: "/m/wage", label: "賃金", icon: "💴" });
  if (features.leaveEnabled) nav.push({ href: "/m/leave", label: "有給", icon: "🏖️" });

  return (
    <Shell
      variant="mobile"
      title="マイページ"
      subtitle="HR EVA"
      user={{ name: session.user.name, email: session.user.email }}
      nav={nav}
    >
      {children}
    </Shell>
  );
}
