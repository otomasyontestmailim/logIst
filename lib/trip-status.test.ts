import { describe, it, expect } from "vitest";
import {
  canTransition,
  isTripStatus,
  PIPELINE_STATUSES,
  ALL_STATUSES,
  DRIVER_NEXT_STATUS,
} from "@/lib/trip-status";
import type { TripStatus } from "@/lib/supabase/database.types";

describe("canTransition — rol bazlı sefer durum geçişleri", () => {
  it("seferi yalnız admin/dispatcher başlatır (requested→driver_approval)", () => {
    expect(canTransition("dispatcher", "requested", "driver_approval")).toBe(
      true,
    );
    expect(canTransition("admin", "requested", "driver_approval")).toBe(true);
    expect(canTransition("driver", "requested", "driver_approval")).toBe(false);
  });

  it("şoför seferi kabul eder (driver_approval→dispatched)", () => {
    expect(canTransition("driver", "driver_approval", "dispatched")).toBe(true);
  });

  it("şoför reddedebilir (driver_approval→requested)", () => {
    expect(canTransition("driver", "driver_approval", "requested")).toBe(true);
  });

  it("teslimatı yalnız admin/dispatcher tamamlar (delivery_approval→completed)", () => {
    expect(canTransition("dispatcher", "delivery_approval", "completed")).toBe(
      true,
    );
    expect(canTransition("admin", "delivery_approval", "completed")).toBe(true);
    expect(canTransition("driver", "delivery_approval", "completed")).toBe(
      false,
    );
  });

  it("geçersiz atlama reddedilir (in_transit→completed)", () => {
    expect(canTransition("driver", "in_transit", "completed")).toBe(false);
    expect(canTransition("admin", "in_transit", "completed")).toBe(false);
  });

  it("terminal durumdan geçiş yok (completed→*)", () => {
    expect(canTransition("admin", "completed", "requested")).toBe(false);
  });
});

describe("isTripStatus", () => {
  it("geçerli durum → true", () => {
    expect(isTripStatus("in_transit")).toBe(true);
    expect(isTripStatus("completed")).toBe(true);
  });
  it("geçersiz → false", () => {
    expect(isTripStatus("bogus")).toBe(false);
    expect(isTripStatus("")).toBe(false);
  });
});

describe("durum sabitleri tutarlılığı", () => {
  it("PIPELINE_STATUSES 'completed' içermez; ALL_STATUSES içerir", () => {
    expect(PIPELINE_STATUSES).not.toContain("completed");
    expect(ALL_STATUSES).toContain("completed");
    expect(ALL_STATUSES.length).toBe(PIPELINE_STATUSES.length + 1);
  });

  it("şoförün tek-tuş zinciri (DRIVER_NEXT_STATUS) gerçekten geçerli şoför geçişleridir", () => {
    for (const [from, to] of Object.entries(DRIVER_NEXT_STATUS)) {
      expect(
        canTransition("driver", from as TripStatus, to as TripStatus),
      ).toBe(true);
    }
  });
});
