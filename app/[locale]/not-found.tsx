import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Link href="/" className={buttonVariants()}>
        {t("goHome")}
      </Link>
    </main>
  );
}
