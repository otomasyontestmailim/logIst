"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toCsv } from "@/lib/export/csv";

export type TripSummary = {
  total: number;
  completed: number;
  active: number;
};

export type DriverStat = {
  driverId: string;
  driverName: string;
  total: number;
  completed: number;
  rate: number;
};

export function ReportsClient({
  summary,
  driverStats,
  initialFrom,
  initialTo,
}: {
  summary: TripSummary;
  driverStats: DriverStat[];
  initialFrom: string;
  initialTo: string;
}) {
  const t = useTranslations("Reports");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function applyFilter() {
    const sp = new URLSearchParams(searchParams.toString());
    if (from) sp.set("from", from);
    else sp.delete("from");
    if (to) sp.set("to", to);
    else sp.delete("to");
    router.push(`?${sp.toString()}`);
  }

  function clearFilter() {
    setFrom("");
    setTo("");
    router.push("?");
  }

  function exportCsv() {
    if (driverStats.length === 0) {
      toast.info(t("noData"));
      return;
    }
    const csv = toCsv(driverStats, [
      { header: t("colDriver"), value: (r) => r.driverName },
      { header: t("colTrips"), value: (r) => r.total },
      { header: t("colCompleted"), value: (r) => r.completed },
      { header: t("colRate"), value: (r) => `${r.rate}%` },
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "driver-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tarih filtresi */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-from">{t("dateFrom")}</Label>
          <Input
            id="date-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-to">{t("dateTo")}</Label>
          <Input
            id="date-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={applyFilter}>
            {t("filter")}
          </Button>
          {(from || to) && (
            <Button type="button" variant="outline" onClick={clearFilter}>
              {t("clearFilter")}
            </Button>
          )}
        </div>
      </div>

      {/* Sefer özeti */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("tripSummary")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t("totalTrips"), value: summary.total },
            { label: t("completedTrips"), value: summary.completed },
            { label: t("activeTrips"), value: summary.active },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
              <span className="text-3xl font-bold tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Şoför performansı */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("driverPerformance")}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
            >
              <Download className="mr-1.5 size-3.5" />
              {t("exportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title={t("zipPlaceholder")}
            >
              <FileDown className="mr-1.5 size-3.5" />
              {t("exportZip")}
            </Button>
          </div>
        </div>

        {driverStats.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("colDriver")}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("colTrips")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("colCompleted")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("colRate")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {driverStats.map((row) => (
                  <tr key={row.driverId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.driverName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.completed}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          row.rate >= 80
                            ? "font-semibold text-green-600 dark:text-green-400"
                            : row.rate >= 50
                              ? "text-warning"
                              : "text-destructive"
                        }
                      >
                        {row.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
