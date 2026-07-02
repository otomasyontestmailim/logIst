"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type NotificationAlert = {
  id: string;
  type: "expired_doc" | "expiring_doc" | "pending_docs" | "due_soon";
  message: string;
};

export function NotificationsDropdown({
  alerts,
}: {
  alerts: NotificationAlert[];
}) {
  const t = useTranslations("Notifications");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasAlerts = alerts.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
      >
        <Bell className="size-4" />
        {hasAlerts && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover shadow-floating">
          <div className="border-b px-4 py-2.5">
            <p className="text-sm font-semibold">{t("title")}</p>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 text-sm",
                    alert.type === "expired_doc" && "bg-destructive/5",
                    alert.type === "expiring_doc" && "bg-warning/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      alert.type === "expired_doc" && "bg-destructive",
                      alert.type === "expiring_doc" && "bg-warning",
                      alert.type === "pending_docs" && "bg-primary",
                      alert.type === "due_soon" && "bg-blue-500",
                    )}
                  />
                  <span className="leading-snug">{alert.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
