import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Liste/detay sayfalarının ortak başlık deseni: sol tarafta başlık +
 * açıklama, sağda eylemler. Elle yazılmış ~10 kopyanın tek karşılığı.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
