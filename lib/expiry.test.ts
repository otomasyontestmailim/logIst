import { describe, it, expect } from "vitest";
import { daysUntil, expiryStatus } from "@/lib/expiry";

const DAY = 86_400_000;
// Bugüne göreli ISO tarih — TZ kaynaklı ±1 gün kaymalarına dayanıklı olsun diye
// sınır değerlerden uzak günler seçilir.
const isoInDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

describe("daysUntil", () => {
  it("null / undefined girdi → null", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
  });

  it("geçersiz tarih → null", () => {
    expect(daysUntil("not-a-date")).toBeNull();
  });

  it("gelecekteki tarih → pozitif (≈ verilen gün)", () => {
    const d = daysUntil(isoInDays(10));
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThanOrEqual(9);
    expect(d!).toBeLessThanOrEqual(11);
  });

  it("geçmiş tarih → negatif", () => {
    expect(daysUntil(isoInDays(-10))!).toBeLessThan(0);
  });
});

describe("expiryStatus", () => {
  it("tarih yok / geçersiz → null", () => {
    expect(expiryStatus(null)).toBeNull();
    expect(expiryStatus(undefined)).toBeNull();
    expect(expiryStatus("bogus")).toBeNull();
  });

  it("geçmiş → expired", () => {
    expect(expiryStatus(isoInDays(-5))).toBe("expired");
  });

  it("yakın gelecek (≤30g) → expiring", () => {
    expect(expiryStatus(isoInDays(10))).toBe("expiring");
  });

  it("uzak gelecek (>30g) → ok", () => {
    expect(expiryStatus(isoInDays(120))).toBe("ok");
  });

  it("özel eşik: 120g, eşik 200 → expiring", () => {
    expect(expiryStatus(isoInDays(120), 200)).toBe("expiring");
  });
});
