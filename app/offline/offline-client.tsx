"use client";

export function OfflinePageClient() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="rounded-full bg-muted p-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M3 3l18 18"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold">İnternet bağlantısı yok</h1>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Şu an çevrimdışısınız. Bağlantınız geldiğinde sayfa otomatik olarak
          yenilenir.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Yeniden dene
      </button>
    </div>
  );
}
