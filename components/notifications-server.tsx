import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { expiryStatus, daysUntil } from "@/lib/expiry";
import {
  NotificationsDropdown,
  type NotificationAlert,
} from "./notifications-dropdown";

const EXPIRY_FIELDS = [
  { col: "src_expiry" as const, label: "src" },
  { col: "adr_expiry" as const, label: "adr" },
  { col: "psikoteknik_expiry" as const, label: "psikoteknik" },
  { col: "green_card_expiry" as const, label: "greenCard" },
];

export async function NotificationsServer({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = await getTranslations("Notifications");
  const td = await getTranslations("DocLabels");
  const supabase = await createClient();
  const todayISO = new Date().toISOString().slice(0, 10);
  const nextDay = new Date(todayISO);
  nextDay.setDate(nextDay.getDate() + 1);
  const tomorrowISO = nextDay.toISOString().slice(0, 10);

  const [pendingRes, dueSoonRes, profilesRes, driverNamesRes] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending"),
      supabase
        .from("trips")
        .select("id, origin, destination")
        .eq("organization_id", organizationId)
        .neq("status", "completed")
        .gte("delivery_date", todayISO)
        .lt("delivery_date", tomorrowISO)
        .limit(5),
      supabase
        .from("driver_profiles")
        .select(
          "user_id, src_expiry, adr_expiry, psikoteknik_expiry, green_card_expiry",
        ),
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", organizationId)
        .eq("role", "driver"),
    ]);

  const alerts: NotificationAlert[] = [];

  const pendingCount = pendingRes.count ?? 0;
  if (pendingCount > 0) {
    alerts.push({
      id: "pending_docs",
      type: "pending_docs",
      message: t("pendingDocs", { count: pendingCount }),
    });
  }

  for (const trip of dueSoonRes.data ?? []) {
    alerts.push({
      id: `due_${trip.id}`,
      type: "due_soon",
      message: t("dueSoon", {
        trip: `${trip.origin} → ${trip.destination}`,
      }),
    });
  }

  const nameMap = new Map(
    (driverNamesRes.data ?? []).map((u) => [
      u.id,
      u.full_name ?? u.email ?? "—",
    ]),
  );

  for (const p of profilesRes.data ?? []) {
    const driverName = nameMap.get(p.user_id);
    if (!driverName) continue;
    for (const f of EXPIRY_FIELDS) {
      const date = p[f.col];
      const status = expiryStatus(date);
      if (status === "expired") {
        alerts.push({
          id: `expired_${p.user_id}_${f.col}`,
          type: "expired_doc",
          message: t("expiredDoc", { driver: driverName, doc: td(f.label) }),
        });
      } else if (status === "expiring") {
        const days = daysUntil(date) ?? 0;
        alerts.push({
          id: `expiring_${p.user_id}_${f.col}`,
          type: "expiring_doc",
          message: t("expiringDoc", {
            driver: driverName,
            doc: td(f.label),
            days,
          }),
        });
      }
    }
  }

  return <NotificationsDropdown alerts={alerts} />;
}
