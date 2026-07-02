"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
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

  async function exportPdf() {
    if (driverStats.length === 0) {
      toast.info(t("noData"));
      return;
    }
    try {
      // Dynamic import — bundles only when needed
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const today = new Date().toLocaleDateString("tr-TR");
      const titleStr = `${t("title")} — ${today}`;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(titleStr, 14, 18);

      // Özet kartları
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${t("totalTrips")}: ${summary.total}   ${t("completedTrips")}: ${summary.completed}   ${t("activeTrips")}: ${summary.active}`,
        14,
        28,
      );

      // Şoför tablosu
      autoTable(doc, {
        startY: 36,
        head: [
          [t("colDriver"), t("colTrips"), t("colCompleted"), t("colRate")],
        ],
        body: driverStats.map((r) => [
          r.driverName,
          r.total,
          r.completed,
          `${r.rate}%`,
        ]),
        styles: { fontSize: 9 },
        // Marka rengi: petrol-teal (#2d6e75)
        headStyles: { fillColor: [45, 110, 117] },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });

      doc.save(`rapor-${today.replace(/\./g, "-")}.pdf`);
    } catch {
      toast.error(t("pdfError"));
    }
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
      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4 shadow-resting">
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
            <StatTile key={label} label={label} value={value} />
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
              onClick={exportPdf}
            >
              <FileText className="mr-1.5 size-3.5" />
              {t("exportPdf")}
            </Button>
          </div>
        </div>

        {driverStats.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colDriver")}</TableHead>
                <TableHead className="text-right">{t("colTrips")}</TableHead>
                <TableHead className="text-right">
                  {t("colCompleted")}
                </TableHead>
                <TableHead className="text-right">{t("colRate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverStats.map((row) => (
                <TableRow key={row.driverId}>
                  <TableCell className="font-medium">
                    {row.driverName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.total}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.completed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        row.rate >= 80
                          ? "font-semibold text-success"
                          : row.rate >= 50
                            ? "text-warning"
                            : "text-destructive"
                      }
                    >
                      {row.rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
