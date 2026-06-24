import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  // Superadmin: public.users satırı yok ama platform_admins'te var → /admin
  if (user!.is_superadmin) {
    redirect({ href: "/admin", locale });
  }
  // Auth hesabı var ama public.users satırı yok (firma/rol bağlanmamış):
  // boş ekran yerine açık uyarı göster — RLS hiçbir veri döndürmez,
  // action'lar "unauthorized" döner.
  if (!user!.organization_id || !user!.role) {
    const tAuth = await getTranslations("Auth");
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">{tAuth("noOrgTitle")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {tAuth("noOrgDescription")}
        </p>
        <SignOutButton />
      </main>
    );
  }
  // Şoför panel yerine kendi sefer ekranını kullanır.
  if (user!.role === "driver") {
    redirect({ href: "/driver", locale });
  }

  const t = await getTranslations("App");

  return (
    <AppShell
      appName={t("name")}
      userLabel={user!.full_name ?? user!.authEmail ?? ""}
      role={user!.role}
    >
      {children}
    </AppShell>
  );
}
