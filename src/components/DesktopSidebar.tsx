"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/Shell";

export function DesktopSidebar({
  brand,
  roleLabel,
  items,
}: {
  brand: string;
  roleLabel: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-slate-200 flex-col">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="text-lg font-bold tracking-tight text-slate-900">{brand}</div>
        <div className="text-[10px] tracking-widest text-slate-500 font-semibold mt-0.5">
          {roleLabel}
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((n) => {
          const home = items[0]?.href ?? "/";
          const active =
            n.href === home ? pathname === home : pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-900 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden className="w-5 text-center text-base">
                {n.icon ?? "•"}
              </span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
