"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

/**
 * "Ana ekrana ekle" banner'ı.
 * - beforeinstallprompt desteklenen tarayıcılarda (Chrome/Android) native prompt gösterir.
 * - iOS için manuel talimat gösterir.
 * - "Kapat" tıklanırsa 7 gün session storage'da saklar.
 */
export function PwaInstallBanner() {
  const t = useTranslations("PwaInstall");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Daha önce kapatıldıysa gösterme
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Zaten yüklü mü? (standalone mod)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // iOS Safari tespiti
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);

    if (isIos && isSafari) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIos(true);
      setVisible(true);
    }

    // Android Chrome / Edge → beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label={t("ariaLabel")}
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border bg-popover shadow-floating p-4 flex items-start gap-3 md:left-auto md:right-6 md:max-w-sm"
    >
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 shrink-0">
        <Download className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t("title")}</p>
        {showIos ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("iosInstructions")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("description")}
          </p>
        )}
        {!showIos && deferredPrompt && (
          <Button size="sm" className="mt-2 h-7 text-xs" onClick={install}>
            {t("installButton")}
          </Button>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="text-muted-foreground hover:text-foreground shrink-0 -mt-0.5 -mr-0.5"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
