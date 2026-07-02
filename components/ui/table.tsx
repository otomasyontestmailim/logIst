import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tablo primitifi — kart yüzeyli konteyner (yatay scroll dahili) + shadcn
 * tarzı alt parçalar. Elle yazılmış `<div class="overflow-x-auto ...">
 * <table>` reçetesinin tek karşılığı.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="w-full overflow-x-auto rounded-xl border bg-card shadow-resting"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/50 [&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b transition-colors hover:bg-muted/40", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-2.5 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3 align-middle", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
