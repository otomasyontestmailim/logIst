import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm, OrgForm, PasswordForm } from "./settings-client";
import type { Database } from "@/lib/supabase/database.types";

type OrgRow = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  "name" | "tax_no"
>;

export default async function SettingsPage() {
  const locale = await getLocale();
  const t = await getTranslations("Settings");
  const me = await getCurrentUser();

  if (!me) {
    redirect({ href: "/sign-in", locale });
    return null;
  }

  const supabase = await createClient();

  let org: OrgRow | null = null;
  if (me.organization_id) {
    const { data } = await supabase
      .from("organizations")
      .select("name, tax_no")
      .eq("id", me.organization_id)
      .single<OrgRow>();
    org = data;
  }

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Profile */}
      <section className="max-w-2xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("profileTitle")}</h2>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <ProfileForm fullName={me.full_name} email={me.authEmail} />
        </div>
      </section>

      {/* Password */}
      <section className="max-w-2xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("passwordTitle")}</h2>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <PasswordForm />
        </div>
      </section>

      {/* Org (admin only) */}
      {me.role === "admin" && org && (
        <section className="max-w-2xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{t("orgTitle")}</h2>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <OrgForm orgName={org.name} taxNo={org.tax_no} />
          </div>
        </section>
      )}
      {me.role !== "admin" && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("orgOnlyAdmin")}
        </p>
      )}
    </main>
  );
}
