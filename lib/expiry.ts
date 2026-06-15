// Şoför belge geçerlilik tarihleri için ortak durum hesabı.
// Tek kaynak: hem şoför listesi rozetleri (ExpiryBadge) hem dashboard uyarıları
// bu helper'ı kullanır.

export type ExpiryStatus = "expired" | "expiring" | "ok";

/** Verilen ISO tarihe kalan tam gün (negatif = geçmiş). null girdi → null. */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Belge geçerlilik durumu. `expiring` eşiği varsayılan 30 gün.
 * null girdi (tarih yok) → null döner; çağıran gösterip göstermemeye karar verir.
 */
export function expiryStatus(
  date?: string | null,
  thresholdDays = 30,
): ExpiryStatus | null {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= thresholdDays) return "expiring";
  return "ok";
}
