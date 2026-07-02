import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
    <main className="flex flex-1 flex-col gap-2 p-4 md:p-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="mt-4">
        {logs.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead>{t("colUser")}</TableHead>
                <TableHead>{t("colAction")}</TableHead>
                <TableHead>{t("colEntity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(format, log.created_at)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {log.user_id ? (nameMap.get(log.user_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {log.action}
                    </code>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    {log.entity}
                    {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  );
}
