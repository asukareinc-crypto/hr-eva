import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MobileBottomNav, type MobileNavItem } from "@/components/MobileBottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";

async function getOtherIdentityCount(email: string | null | undefined, currentUserId: string | undefined) {
  if (!email) return 0;
  const count = await prisma.user.count({
    where: { email, isActive: true, NOT: currentUserId ? { id: currentUserId } : undefined },
  });
  return count;
}

export type NavItem = { href: string; label: string; icon?: string };

export async function Shell({
  title,
  subtitle,
  nav,
  user,
  children,
  variant = "desktop",
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
  variant?: "desktop" | "mobile";
}) {
  const session = await auth();
  const otherCount = await getOtherIdentityCount(user.email, session?.user?.id);

  if (variant === "mobile") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-widest text-slate-500 font-semibold">
              {subtitle ?? "HR EVA"}
            </div>
            <div className="text-sm font-bold">{user.name ?? user.email}</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {otherCount > 0 && (
              <Link href="/switch-account" className="underline-offset-2 hover:underline">
                切替 ({otherCount + 1})
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-xs text-slate-600">ログアウト</button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24">{children}</main>
        <MobileBottomNav
          items={nav.map<MobileNavItem>((n) => ({
            href: n.href,
            label: n.label,
            icon: n.icon ?? "•",
          }))}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <DesktopSidebar
        brand="HR EVA"
        roleLabel={subtitle ?? "HR EVA"}
        items={nav}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="px-6 py-3 flex items-center justify-between">
            <div>
              <div className="text-base font-bold">{title}</div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600">{user.name ?? user.email}</span>
              {otherCount > 0 && (
                <Link
                  href="/switch-account"
                  className="text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
                >
                  アカウント切替 ({otherCount + 1})
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-sm text-slate-800">{title}</h2>
      {action}
    </div>
  );
}
