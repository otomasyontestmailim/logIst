import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  // Şoför panel yerine kendi sefer ekranına gider.
  if (user!.role === "driver") {
    redirect({ href: "/driver", locale });
  }

  const t = await getTranslations("Dashboard");

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">
        {t("welcome")}, {user!.full_name ?? user!.authEmail}
      </p>
    </main>
  );
}
