import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format-date";
import type { Database } from "@/lib/supabase/database.types";

type AuditRow = Pick<
  Database["public"]["Tables"]["audit_logs"]["Row"],
  "id" | "user_id" | "action" | "entity" | "entity_id" | "created_at"
>;
type UserInfo = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

export default async function AuditPage() {
  const t = await getTranslations("Audit");
  const me = await getCurrentUser();

  // Denetim kaydı yalnız admin'e. RLS de admin-only döndürür; UI'de de kapat.
  if (me?.role !== "admin") {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  const format = await getFormatter();
  const supabase = await createClient();

  const [logsRes, usersRes] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, user_id, action, entity, entity_id, created_at")
      .eq("organization_id", me!.organization_id!)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", me!.organization_id!),
  ]);

  const logs = (logsRes.data as AuditRow[]) ?? [];
  const nameMap = new Map(
    ((usersRes.data as UserInfo[]) ?? []).map((u) => [
      u.id,
      u.full_name ?? u.email ?? "—",
    ]),
  );

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                <th className="px-4 py-3 font-medium">{t("colUser")}</th>
                <th className="px-4 py-3 font-medium">{t("colAction")}</th>
                <th className="px-4 py-3 font-medium">{t("colEntity")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(format, log.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.user_id ? (nameMap.get(log.user_id) ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {log.entity}
                    {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
