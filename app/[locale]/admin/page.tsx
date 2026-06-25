import { getTranslations } from "next-intl/server";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { Building2, Users, CalendarDays, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { NewOrgForm } from "./new-org-form";

export default async function AdminPage() {
  const t = await getTranslations("Admin");

  // Service-role anahtarı yoksa sayfayı çökertme — superadmin'e net,
  // eyleme dönük bir yapılandırma hatası göster (bu sayfa zaten superadmin'e özel).
  const admin = adminClientOrNull();
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <h1 className="text-lg font-semibold">{t("configErrorTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("configErrorBody")}
          </p>
          <code className="rounded bg-muted px-2 py-1 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
        </div>
      </div>
    );
  }

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, tax_no, plan, created_at")
    .order("created_at", { ascending: false });

  // Her org için kullanıcı sayısını çek
  const orgIds = (orgs ?? []).map((o) => o.id);
  const { data: userCounts } = await admin
    .from("users")
    .select("organization_id")
    .in("organization_id", orgIds);

  const countMap: Record<string, number> = {};
  for (const row of userCounts ?? []) {
    countMap[row.organization_id] = (countMap[row.organization_id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <NewOrgForm />

      <div>
        <h1 className="text-2xl font-bold">{t("orgsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("orgsSubtitle", { count: orgs?.length ?? 0 })}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">{t("colName")}</th>
              <th className="px-4 py-3">{t("colTaxNo")}</th>
              <th className="px-4 py-3">{t("colPlan")}</th>
              <th className="px-4 py-3">{t("colUsers")}</th>
              <th className="px-4 py-3">{t("colCreated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(orgs ?? []).map((org) => (
              <tr key={org.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <Link
                      href={`/admin/${org.id}`}
                      className="font-medium text-primary hover:underline underline-offset-2"
                    >
                      {org.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {org.tax_no ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {org.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="size-3.5" />
                    {countMap[org.id] ?? 0}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {new Date(org.created_at).toLocaleDateString("tr-TR")}
                  </div>
                </td>
              </tr>
            ))}
            {(orgs ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("noOrgs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
