"use client";

import { useTranslations } from "next-intl";

/**
 * Server Action hata kodlarını (örn. "email_required") yerelleştirilmiş
 * metne çevirir. Eşleşme yoksa ham kodu döndürür (regresyon güvenli).
 */
export function useErrorText() {
  const te = useTranslations("ValidationErrors");
  return (code?: string): string => {
    if (!code) return "";
    return te.has(code) ? te(code) : code;
  };
}
