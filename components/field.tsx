import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form alanı sarmalayıcı — etiket + kontrol + opsiyonel hata satırı.
 * Ekran dosyalarındaki 5 kopya lokal `Field`'ın tek karşılığı.
 */
export function Field({
  label,
  htmlFor,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
