import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stillenmiş yerli <select> — Input ile aynı yükseklik/odak reçetesi.
 * Davranış değişmez; yalnız görünüm token'lara bağlanır.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div data-slot="native-select" className="relative w-full">
      <select
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 [&>option]:bg-popover [&>option]:text-popover-foreground",
          className,
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
