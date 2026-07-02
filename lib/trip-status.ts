import type { TripStatus, UserRole } from "@/lib/supabase/database.types";
import type { StatusTone } from "@/components/ui/status-chip";

/** Pipeline sırası — dashboard sayaç barı ve filtreler bu sırayı kullanır. */
export const PIPELINE_STATUSES: TripStatus[] = [
  "requested",
  "driver_approval",
  "dispatched",
  "loading",
  "in_transit",
  "delivering",
  "delivery_approval",
];

/** Tüm durumlar (completed dahil) — form/filtre seçenekleri için. */
export const ALL_STATUSES: TripStatus[] = [...PIPELINE_STATUSES, "completed"];

/** Şoförün tek tuşla ilerlettiği zincir. */
export const DRIVER_NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  driver_approval: "dispatched", // Seferi kabul et
  dispatched: "loading", // Yükleme yerine vardım
  loading: "in_transit", // Yükümü yükledim
  in_transit: "delivering", // Teslimat yerine vardım
  delivering: "delivery_approval", // Teslim ettim
};

type Transition = { to: TripStatus; roles: UserRole[] };

/** Geçerli geçişler ve kimin yapabileceği. Admin/dispatcher panelden
 *  serbest düzeltme yapabilir (updateTrip); bu harita updateTripStatus
 *  için şoför + onay akışını sınırlar. */
const TRANSITIONS: Partial<Record<TripStatus, Transition[]>> = {
  requested: [{ to: "driver_approval", roles: ["admin", "dispatcher"] }],
  driver_approval: [
    { to: "dispatched", roles: ["driver", "admin", "dispatcher"] },
    { to: "requested", roles: ["driver", "admin", "dispatcher"] }, // red
  ],
  dispatched: [{ to: "loading", roles: ["driver", "admin", "dispatcher"] }],
  loading: [{ to: "in_transit", roles: ["driver", "admin", "dispatcher"] }],
  in_transit: [{ to: "delivering", roles: ["driver", "admin", "dispatcher"] }],
  delivering: [
    { to: "delivery_approval", roles: ["driver", "admin", "dispatcher"] },
  ],
  delivery_approval: [{ to: "completed", roles: ["admin", "dispatcher"] }],
};

export function canTransition(
  role: UserRole,
  from: TripStatus,
  to: TripStatus,
): boolean {
  return (TRANSITIONS[from] ?? []).some(
    (tr) => tr.to === to && tr.roles.includes(role),
  );
}

export function isTripStatus(v: string): v is TripStatus {
  return (ALL_STATUSES as string[]).includes(v);
}

/** Durum → anlamsal ton sınıfı (globals.css'te tanımlı). Tek palet, marka
 *  token'larından türetilmiş; rainbow değil. Ton = gereken dikkat türü:
 *  idle (boşta) · wait (el-değişimi bekliyor) · active (hareket) · done. */
export const STATUS_TONE: Record<TripStatus, string> = {
  requested: "status-idle",
  driver_approval: "status-wait", // şoför kabulü bekliyor
  dispatched: "status-active",
  loading: "status-active",
  in_transit: "status-active",
  delivering: "status-active",
  delivery_approval: "status-wait", // ofis onayı bekliyor
  completed: "status-done",
};

/** Durum rozet sınıfları — panel + şoför ekranında ortak. `status-chip` tint
 *  zemin + koyu metin verir; ton sınıfı hue'yu seçer. */
export const STATUS_CLASSES = Object.fromEntries(
  ALL_STATUSES.map((s) => [s, `status-chip ${STATUS_TONE[s]}`]),
) as Record<TripStatus, string>;

/** Durum → <StatusChip tone=...> için kısa ton adı (STATUS_TONE'un
 *  "status-" önekinden arındırılmış hali). */
export const STATUS_TONE_NAME = Object.fromEntries(
  ALL_STATUSES.map((s) => [s, STATUS_TONE[s].replace("status-", "")]),
) as Record<TripStatus, StatusTone>;
