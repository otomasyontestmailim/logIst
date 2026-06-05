import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DriverPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Driver");

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">{t("noTrips")}</p>
    </main>
  );
}
