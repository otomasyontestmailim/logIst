import * as React from "react";

import { cn } from "@/lib/utils";

export type StatusTone =
  | "idle"
  | "wait"
  | "active"
  | "done"
  | "danger"
  | "info";

/**
 * Tek durum çipi — globals.css'teki anlamsal ton sınıflarını
 * (status-idle/wait/active/done/danger/info) tüketir. Ham
 * bg-green-100/bg-amber-100 rozetlerinin tek karşılığı.
 */
function StatusChip({
  tone,
  withDot = false,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  tone: StatusTone;
  withDot?: boolean;
}) {
  return (
    <span
      data-slot="status-chip"
      className={cn(
        "status-chip inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        `status-${tone}`,
        className,
      )}
      {...props}
    >
      {withDot && (
        <span className="status-dot size-1.5 rounded-full" aria-hidden />
      )}
      {children}
    </span>
  );
}

export { StatusChip };
