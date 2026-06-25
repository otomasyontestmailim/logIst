"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";

export type OrgPlanState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/** Superadmin: org planını günceller (free | suspended). */
export async function updateOrgPlan(
  _prev: OrgPlanState,
  formData: FormData,
): Promise<OrgPlanState> {
  const me = await getCurrentUser();
  if (!me?.is_superadmin) return { ok: false, error: "unauthorized" };

  const orgId = nn(formData.get("org_id"));
  const plan = nn(formData.get("plan"));
  if (!orgId) return { ok: false, error: "id_required" };
  if (plan !== "free" && plan !== "suspended")
    return { ok: false, error: "status_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { error } = await admin
    .from("organizations")
    .update({ plan })
    .eq("id", orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/admin", "page");
  revalidatePath(`/[locale]/admin/${orgId}`, "page");
  return { ok: true, message: "updated" };
}
