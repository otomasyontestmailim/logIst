import type { TripStatus, UserRole } from "@/lib/supabase/database.types";

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

/** Durum rozet renkleri — panel + şoför ekranında ortak. */
export const STATUS_CLASSES: Record<TripStatus, string> = {
  requested:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  driver_approval:
    "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  dispatched: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  loading: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  in_transit:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  delivering:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  delivery_approval:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};
