"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { NavItem } from "@/components/Shell";

export function MobileAppDrawer({
  brand,
  roleLabel,
  items,
}: {
  brand: string;
  roleLabel: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ルート変更時に自動で閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // body スクロール抑止
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="メニューを開く"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-slate-700 hover:bg-slate-100 -ml-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 lg:hidden flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold tracking-tight text-slate-900">
                  {brand}
                </div>
                <div className="text-[10px] tracking-widest text-slate-500 font-semibold mt-0.5">
                  {roleLabel}
                </div>
              </div>
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-md text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {items.map((n) => {
                const home = items[0]?.href ?? "/";
                const active =
                  n.href === home
                    ? pathname === home
                    : pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span aria-hidden className="w-5 text-center text-lg">
                      {n.icon ?? "•"}
                    </span>
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
