import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Building2, CalendarDays, Users } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrgPlanToggle } from "./admin-detail-client";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("AdminDetail");
  const tAdmin = await getTranslations("Admin");
  const tRoles = await getTranslations("Roles");
  const format = await getFormatter();

  const me = await getCurrentUser();
  if (!me?.is_superadmin) notFound();

  const admin = adminClientOrNull();
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <h1 className="text-lg font-semibold">
            {tAdmin("configErrorTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tAdmin("configErrorBody")}
          </p>
          <code className="rounded bg-muted px-2 py-1 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
        </div>
      </div>
    );
  }

  const [orgRes, membersRes] = await Promise.all([
    admin.from("organizations").select("*").eq("id", id).single(),
    admin
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("organization_id", id)
      .order("created_at"),
  ]);

  if (!orgRes.data) notFound();

  const org = orgRes.data;
  const members = membersRes.data ?? [];

  const isSuspended = org.plan === "suspended";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("back")}
      </Link>

      {/* Org header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            {org.tax_no && (
              <p className="text-sm text-muted-foreground">{org.tax_no}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isSuspended
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isSuspended ? t("planSuspended") : t("planActive")} ({org.plan})
          </span>
          <OrgPlanToggle orgId={org.id} currentPlan={org.plan} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="size-5 text-muted-foreground" />}
          label={tAdmin("colUsers")}
          value={members.length.toString()}
        />
        <StatCard
          icon={<CalendarDays className="size-5 text-muted-foreground" />}
          label={tAdmin("colCreated")}
          value={formatDate(format, org.created_at)}
        />
      </div>

      {/* Members table */}
      <div>
        <h2 className="mb-3 font-semibold">{t("membersTitle")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colFullName")}</TableHead>
              <TableHead>{t("colEmail")}</TableHead>
              <TableHead>{t("colRole")}</TableHead>
              <TableHead>{t("colCreated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.email}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {tRoles(member.role as "admin" | "dispatcher" | "driver")}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(format, member.created_at)}
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("noMembers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-resting">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
