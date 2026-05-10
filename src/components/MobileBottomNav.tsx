"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: string; // emoji or short text
};

export function MobileBottomNav({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((n) => {
        // 完全一致 or サブパスマッチ（"/m" は他にマッチしないよう完全一致のみ）
        const active =
          n.href === "/m"
            ? pathname === "/m"
            : pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              active
                ? "text-slate-900 bg-slate-100"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span
              className={`text-lg leading-none ${active ? "scale-110" : ""} transition-transform`}
              aria-hidden
            >
              {n.icon}
            </span>
            <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
              {n.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
