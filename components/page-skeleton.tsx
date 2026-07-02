import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route seviyesindeki `loading.tsx` dosyalarının ortak gövdesi:
 * başlık barı + opsiyonel metrik satırı + tablo silueti.
 */
export function PageSkeleton({
  tiles = 0,
  rows = 6,
}: {
  tiles?: number;
  rows?: number;
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      {tiles > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: tiles }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card shadow-resting">
        <Skeleton className="h-10 w-full rounded-none" />
        <div className="space-y-0 divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
