import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ortak boş-durum deseni — kesikli çerçeve, opsiyonel ikon rozeti,
 * başlık + açıklama + eylem. 7 kopya dashed div'in tek karşılığı.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
