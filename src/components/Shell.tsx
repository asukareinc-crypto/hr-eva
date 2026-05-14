import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MobileBottomNav, type MobileNavItem } from "@/components/MobileBottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileAppDrawer } from "@/components/MobileAppDrawer";

async function getOtherIdentityCount(
  email: string | null | undefined,
  currentUserId: string | undefined
) {
  if (!email) return 0;
  const count = await prisma.user.count({
    where: {
      email,
      isActive: true,
      NOT: currentUserId ? { id: currentUserId } : undefined,
    },
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
          <div className="min-w-0">
            <div className="text-[10px] tracking-widest text-slate-500 font-semibold">
              {subtitle ?? "HR EVA"}
            </div>
            <div className="text-sm font-bold truncate">{user.name ?? user.email}</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 shrink-0">
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
        <main className="flex-1 p-3 sm:p-4 pb-24">{children}</main>
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

  // デスクトップ／タブレット向け（スマホ時はサイドバー非表示・ドロワー表示）
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <DesktopSidebar brand="HR EVA" roleLabel={subtitle ?? "HR EVA"} items={nav} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MobileAppDrawer
                brand="HR EVA"
                roleLabel={subtitle ?? "HR EVA"}
                items={nav}
              />
              <div className="min-w-0">
                <div className="text-base font-bold truncate">{title}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm shrink-0">
              <span className="hidden sm:inline text-slate-600 truncate max-w-[200px]">
                {user.name ?? user.email}
              </span>
              {otherCount > 0 && (
                <Link
                  href="/switch-account"
                  className="text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">アカウント</span>切替 ({otherCount + 1})
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline text-xs sm:text-sm">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-6 max-w-6xl w-full mx-auto">{children}</main>
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
    <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-600 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
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
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-x-auto ${className}`}
    >
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
    <div className="flex items-center justify-between mb-3 gap-2">
      <h2 className="font-semibold text-sm text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

/** モバイルで横スクロールできるテーブルラッパー */
export function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-3 sm:mx-0 overflow-x-auto">
      <div className="min-w-[640px] sm:min-w-0 px-3 sm:px-0">{children}</div>
    </div>
  );
}
