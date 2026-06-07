import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAT_KEYS = [
  "activeTrips",
  "pendingDocuments",
  "lateDeliveries",
  "drivers",
] as const;

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_KEYS.map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(key)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Supabase bağlanınca gerçek sayılarla doldurulacak */}
              <span className="text-3xl font-bold">0</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
