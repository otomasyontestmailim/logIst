import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Metrik karosu — dashboard/raporlar/detay sayfalarındaki üç ayrı
 * "büyük sayı" uygulamasının tek karşılığı. `href` verilirse tıklanabilir.
 * `tone="warning"` uyarı varyantını (amber tint) açar.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "warning";
  className?: string;
}) {
  const warning = tone === "warning";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl leading-none font-bold tabular-nums",
          warning ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  );

  const surface = cn(
    "block rounded-xl border bg-card p-5 shadow-resting",
    warning && "border-warning/40 bg-warning/5",
    href &&
      "transition-all outline-none hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={surface}>
        {body}
      </Link>
    );
  }
  return <div className={surface}>{body}</div>;
}
