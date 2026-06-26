import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface PaginationProps {
  /** Current 1-based page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total record count */
  total: number;
  /** Base URL to append ?page=N to (existing query string preserved via params) */
  baseParams?: Record<string, string>;
}

export function Pagination({
  page,
  pageSize,
  total,
  baseParams = {},
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Show up to 7 page buttons, centred around current page
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 py-4 text-sm"
    >
      {hasPrev ? (
        <Link
          href={href(page - 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md border border-input opacity-40">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {start > 1 && (
        <>
          <Link
            href={href(1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          >
            1
          </Link>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-medium"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          >
            {p}
          </Link>
        ),
      )}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <Link
            href={href(totalPages)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          >
            {totalPages}
          </Link>
        </>
      )}

      {hasNext ? (
        <Link
          href={href(page + 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md border border-input opacity-40">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
