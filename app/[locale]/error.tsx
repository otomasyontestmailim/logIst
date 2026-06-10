"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("description")}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">#{error.digest}</p>
      )}
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
