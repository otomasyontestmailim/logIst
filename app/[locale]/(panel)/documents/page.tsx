import { getTranslations } from "next-intl/server";

export default async function DocumentsPage() {
  const t = await getTranslations("Documents");
  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("comingSoon")}
      </div>
    </main>
  );
}
