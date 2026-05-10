"use client";

import { useEffect } from "react";

/**
 * Service Worker 登録（PWA 用）。
 * - 本番ビルドのみ登録
 * - 開発時は逆に既存登録を解除して、HTML キャッシュによる古い表示を防ぐ
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      // 開発中はキャッシュ衝突防止のため解除
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);

  return null;
}
