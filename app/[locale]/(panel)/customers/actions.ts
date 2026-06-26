"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { vRequired, hasErrors, type FieldErrors } from "@/lib/validate";

export type CustomerFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const name = nn(formData.get("name"));
  const createCustErrors: FieldErrors = {};
  const nameErr = vRequired(name, "name_required");
  if (nameErr) createCustErrors.name = nameErr;
  if (hasErrors(createCustErrors))
    return { ok: false, fieldErrors: createCustErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };
  const { data: inserted, error } = await admin
    .from("customers")
    .insert({
      organization_id: me.organization_id,
      name: name!,
      type: (nn(formData.get("type")) ?? "both") as
        | "both"
        | "shipper"
        | "consignee",
      country: nn(formData.get("country")),
      city: nn(formData.get("city")),
      address: nn(formData.get("address")),
      contact: nn(formData.get("contact")),
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: "customer.create",
    entity: "customers",
    entityId: inserted?.id,
  });
  revalidatePath("/[locale]/customers", "page");
  return { ok: true, message: "created" };
}

export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const customerId = nn(formData.get("customer_id"));
  const name = nn(formData.get("name"));
  if (!customerId) return { ok: false, error: "id_required" };
  const updateCustErrors: FieldErrors = {};
  const updNameErr = vRequired(name, "name_required");
  if (updNameErr) updateCustErrors.name = updNameErr;
  if (hasErrors(updateCustErrors))
    return { ok: false, fieldErrors: updateCustErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target, error: lookupError } = await admin
    .from("customers")
    .select("organization_id")
    .eq("id", customerId)
    .maybeSingle();
  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin
    .from("customers")
    .update({
      name: name ?? undefined,
      type: (nn(formData.get("type")) ?? "both") as
        | "both"
        | "shipper"
        | "consignee",
      country: nn(formData.get("country")),
      city: nn(formData.get("city")),
      address: nn(formData.get("address")),
      contact: nn(formData.get("contact")),
    })
    .eq("id", customerId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: "customer.update",
    entity: "customers",
    entityId: customerId,
  });
  revalidatePath("/[locale]/customers", "page");
  return { ok: true, message: "updated" };
}

export async function deleteCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin") return { ok: false, error: "forbidden" };

  const customerId = nn(formData.get("customer_id"));
  if (!customerId) return { ok: false, error: "id_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target, error: lookupError } = await admin
    .from("customers")
    .select("organization_id")
    .eq("id", customerId)
    .maybeSingle();
  if (lookupError) {
    return { ok: false, error: lookupError.message };
  }
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin.from("customers").delete().eq("id", customerId);
  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "customer.delete",
    entity: "customers",
    entityId: customerId,
  });
  revalidatePath("/[locale]/customers", "page");
  return { ok: true, message: "deleted" };
}
