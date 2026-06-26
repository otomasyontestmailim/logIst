import type { TripStatus } from "./types";

export const DRIVER_NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  driver_approval: "dispatched",
  dispatched: "loading",
  loading: "in_transit",
  in_transit: "delivering",
};

export const STATUS_LABELS: Record<TripStatus, string> = {
  requested: "Taşıma Talebi",
  driver_approval: "Onay Bekliyor",
  dispatched: "Sevk Aşamasında",
  loading: "Yükleme Aşamasında",
  in_transit: "Yolda",
  delivering: "Teslimat Aşamasında",
  delivery_approval: "Teslimat Onayında",
  completed: "Tamamlandı",
};

export const ACTION_LABELS: Partial<Record<TripStatus, string>> = {
  driver_approval: "Seferi Onayla",
  dispatched: "Yükleme Noktasındayım",
  loading: "Yükleme Tamamlandı, Yola Çıkıyorum",
  in_transit: "Teslimat Noktasındayım",
};

export const STATUS_COLOR: Record<TripStatus, string> = {
  requested: "#6B7280",
  driver_approval: "#F59E0B",
  dispatched: "#3B82F6",
  loading: "#3B82F6",
  in_transit: "#10B981",
  delivering: "#10B981",
  delivery_approval: "#F59E0B",
  completed: "#6B7280",
};

export const STATUS_BG_COLOR: Record<TripStatus, string> = {
  requested: "#F3F4F6",
  driver_approval: "#FEF3C7",
  dispatched: "#DBEAFE",
  loading: "#DBEAFE",
  in_transit: "#D1FAE5",
  delivering: "#D1FAE5",
  delivery_approval: "#FEF3C7",
  completed: "#F3F4F6",
};

export function canDriverAdvance(status: TripStatus): boolean {
  return status in DRIVER_NEXT_STATUS;
}

export function isActiveTrip(status: TripStatus): boolean {
  return !["completed", "requested"].includes(status);
}
