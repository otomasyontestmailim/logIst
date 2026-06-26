"use client";

import { useEffect } from "react";

/**
 * Service Worker kayıt bileşeni.
 * Root layout'a ekle — yalnızca HTTPS veya localhost'ta çalışır.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.debug("[SW] Kayıt başarılı:", reg.scope);
      })
      .catch((err) => {
        console.warn("[SW] Kayıt başarısız:", err);
      });
  }, []);

  return null;
}
