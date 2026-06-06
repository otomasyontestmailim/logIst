import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

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
  // Şoför panel yerine kendi sefer ekranını kullanır.
  if (user!.role === "driver") {
    redirect({ href: "/driver", locale });
  }

  const t = await getTranslations("App");

  return (
    <AppShell
      appName={t("name")}
      userLabel={user!.full_name ?? user!.authEmail ?? ""}
    >
      {children}
    </AppShell>
  );
}
