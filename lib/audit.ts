import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";

/**
 * Denetim kaydı (KVKK izlenebilirlik). Service-role ile yazılır (RLS baypas),
 * bu yüzden org/kullanıcı bağlamı çağırandan `me` ile alınır.
 *
 * Audit, ana mutasyonu ASLA bloklamaz: hata yutulur (yalnız sunucu log'una düşer).
 */
export async function logAudit(
  me: Pick<CurrentUser, "id" | "organization_id">,
  entry: { action: string; entity: string; entityId?: string | null },
): Promise<void> {
  if (!me.organization_id) return;
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      organization_id: me.organization_id,
      user_id: me.id,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
    });
  } catch (err) {
    console.error("[audit] yazılamadı:", err);
  }
}
