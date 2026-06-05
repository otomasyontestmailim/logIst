import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("App");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("name")}</h1>
      <p className="text-muted-foreground text-lg">{t("tagline")}</p>
      <Link href="/sign-in" className={buttonVariants()}>
        Giriş Yap
      </Link>
    </main>
  );
}
