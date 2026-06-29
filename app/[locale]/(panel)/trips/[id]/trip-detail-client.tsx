"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronRight,
  Copy,
  Download,
  FileText,
  MapPin,
  PenLine,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import { useErrorText } from "@/lib/use-error-text";
import {
  PIPELINE_STATUSES,
  STATUS_CLASSES,
  STATUS_TONE,
  canTransition,
} from "@/lib/trip-status";
import { updateTripStatus, type TripFormState } from "../actions";
import type {
  TripStatus,
  DocumentType,
  DocumentStatus,
} from "@/lib/supabase/database.types";

export type TripDetailProps = {
  trip: {
    id: string;
    origin: string;
    destination: string;
    status: string;
    load_date: string | null;
    delivery_date: string | null;
    cargo_type: string | null;
    loading_type: string | null;
    tonnage_kg: number | null;
    body_type: string | null;
    tracking_no: string | null;
    distance_km: number | null;
    notes: string | null;
    delivery_signature_url: string | null;
    delivered_at: string | null;
    tracking_token: string | null;
    freight_amount: number | null;
    freight_currency: string | null;
    invoice_status: string | null;
    fuel_level: number | null;
    trip_no: string | null;
    invoice_direction: string | null;
  };
  driver: { id: string; full_name: string | null; email: string | null } | null;
  customer: { id: string; name: string } | null;
  org: { id: string; name: string; tax_no: string | null } | null;
  stops: Array<{
    id: string;
    stop_type: string;
    address: string | null;
    planned_at: string | null;
    seq: number;
  }>;
  documents: Array<{
    id: string;
    type: DocumentType;
    status: DocumentStatus;
    created_at: string;
    uploaded_by: string | null;
    uploaderName: string;
    signedUrl: string | null;
  }>;
  userRole: "admin" | "dispatcher" | "driver" | null;
};

const initial: TripFormState = { ok: false };

export function TripDetailClient({
  trip,
  driver,
  customer,
  org,
  stops,
  documents,
  userRole,
}: TripDetailProps) {
  const t = useTranslations("TripDetail");
  const tt = useTranslations("Trips");
  const ts = useTranslations("TripStatus");
  const tdt = useTranslations("DocumentTypes");
  const tds = useTranslations("DocumentStatus");
  const tlt = useTranslations("LoadingTypes");
  const ti = useTranslations("Invoice");
  const format = useFormatter();
  const errText = useErrorText();
  const router = useRouter();
  const [trackingCopied, setTrackingCopied] = useState(false);

  const currentStatus = trip.status as TripStatus;

  // Next allowed status for admin/dispatcher: the next in pipeline
  const currentIdx = PIPELINE_STATUSES.indexOf(currentStatus);
  const nextStatus: TripStatus | null =
    currentStatus === "delivery_approval"
      ? "completed"
      : currentIdx >= 0 && currentIdx < PIPELINE_STATUSES.length - 1
        ? PIPELINE_STATUSES[currentIdx + 1]
        : null;

  const canAdvance =
    nextStatus !== null &&
    (userRole === "admin" || userRole === "dispatcher") &&
    canTransition(
      userRole as "admin" | "dispatcher",
      currentStatus,
      nextStatus,
    );

  const [statusState, statusAction, statusPending] = useActionState(
    updateTripStatus,
    initial,
  );

  useEffect(() => {
    if (statusState.ok && statusState.message === "updated") {
      toast.success(t("statusUpdated"));
      router.refresh();
    } else if (!statusState.ok && statusState.error) {
      toast.error(t("errorToast", { error: errText(statusState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      {/* Back + header */}
      <Link
        href="/trips"
        className="text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {trip.trip_no && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
              {trip.trip_no}
            </span>
          )}
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            {trip.origin}
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
            {trip.destination}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_CLASSES[currentStatus],
              )}
            >
              {ts(currentStatus)}
            </span>
            {trip.load_date && (
              <span>{formatDate(format, trip.load_date)}</span>
            )}
            {trip.delivery_date && (
              <span>→ {formatDate(format, trip.delivery_date)}</span>
            )}
          </div>
        </div>

        {canAdvance && nextStatus && (
          <form action={statusAction}>
            <input type="hidden" name="trip_id" value={trip.id} />
            <input type="hidden" name="status" value={nextStatus} />
            <Button type="submit" disabled={statusPending}>
              <ChevronRight className="size-4" />
              {t("advanceStatus")}: {ts(nextStatus)}
            </Button>
          </form>
        )}
      </div>

      {/* Pipeline progress */}
      <div className="flex items-center gap-0 overflow-x-auto rounded-lg border bg-card px-4 py-3">
        {PIPELINE_STATUSES.concat(["completed" as TripStatus]).map(
          (s, i, arr) => {
            const done =
              PIPELINE_STATUSES.indexOf(currentStatus) >= i ||
              currentStatus === "completed";
            const active = s === currentStatus;
            return (
              <div key={s} className="flex shrink-0 items-center">
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 px-2",
                    active ? "opacity-100" : done ? "opacity-70" : "opacity-35",
                  )}
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      active
                        ? `status-dot ${STATUS_TONE[s as TripStatus]}`
                        : done
                          ? "bg-primary/60"
                          : "bg-muted-foreground/30",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      active && "font-semibold text-foreground",
                      !active && "text-muted-foreground",
                    )}
                  >
                    {ts(s as TripStatus)}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-px w-4 shrink-0 bg-border" />
                )}
              </div>
            );
          },
        )}
      </div>

      {/* 2-col layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: cargo + stops + docs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cargo */}
          <section className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">{t("cargoInfo")}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {trip.cargo_type && (
                <InfoRow label={tt("cargoType")} value={trip.cargo_type} />
              )}
              {trip.loading_type && (
                <InfoRow
                  label={tt("loadingType")}
                  value={tlt(
                    trip.loading_type as
                      | "palletized"
                      | "bulk"
                      | "parcel"
                      | "other",
                  )}
                />
              )}
              {trip.tonnage_kg != null && (
                <InfoRow
                  label={tt("tonnageKg")}
                  value={trip.tonnage_kg.toString()}
                />
              )}
              {trip.body_type && (
                <InfoRow label={tt("bodyType")} value={trip.body_type} />
              )}
              {trip.tracking_no && (
                <InfoRow label={tt("trackingNo")} value={trip.tracking_no} />
              )}
              {trip.distance_km != null && (
                <InfoRow
                  label={tt("distanceKm")}
                  value={trip.distance_km.toString()}
                />
              )}
              {trip.fuel_level != null && (
                <>
                  <dt className="text-muted-foreground">{tt("fuelLevel")}</dt>
                  <dd className="flex items-center gap-2 font-medium">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full",
                          trip.fuel_level <= 20
                            ? "bg-red-500"
                            : trip.fuel_level <= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${trip.fuel_level}%` }}
                      />
                    </span>
                    <span className="tabular-nums">{trip.fuel_level}%</span>
                  </dd>
                </>
              )}
              {trip.freight_amount != null && (
                <InfoRow
                  label={ti("freightAmount")}
                  value={`${trip.freight_amount} ${trip.freight_currency ?? "EUR"}`}
                />
              )}
              {trip.invoice_status && (
                <InfoRow
                  label={ti("invoiceStatus")}
                  value={ti(trip.invoice_status as "draft" | "sent" | "paid")}
                />
              )}
              {trip.invoice_direction && (
                <InfoRow
                  label={ti("invoiceDirection")}
                  value={ti(trip.invoice_direction as "incoming" | "outgoing")}
                />
              )}
            </dl>
            {trip.notes && (
              <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {trip.notes}
              </p>
            )}
            {trip.freight_amount != null && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { generateInvoicePdf } =
                      await import("@/lib/invoice-pdf");
                    await generateInvoicePdf({
                      tripId: trip.id,
                      origin: trip.origin,
                      destination: trip.destination,
                      loadDate: trip.load_date,
                      deliveryDate: trip.delivery_date,
                      freightAmount: trip.freight_amount,
                      freightCurrency: trip.freight_currency,
                      orgName: org?.name ?? "",
                      orgTaxNo: org?.tax_no ?? null,
                      customerName: customer?.name ?? null,
                    });
                  }}
                >
                  <Download className="mr-1.5 size-4" />
                  {ti("downloadPdf")}
                </Button>
              </div>
            )}
          </section>

          {/* Stops */}
          <section className="space-y-2">
            <h2 className="font-semibold">{t("stopsTitle")}</h2>
            {stops.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noStops")}</p>
            ) : (
              <div className="space-y-2">
                {stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium capitalize">
                        {stop.stop_type}
                      </span>
                      {stop.address && (
                        <p className="text-muted-foreground">{stop.address}</p>
                      )}
                      {stop.planned_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(format, stop.planned_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Documents */}
          <section className="space-y-2">
            <h2 className="font-semibold">{t("documentsTitle")}</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noDocuments")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("colType")}</th>
                      <th className="px-4 py-3 font-medium">
                        {t("colStatus")}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {t("colUploader")}
                      </th>
                      <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            {tdt(doc.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              doc.status === "approved" &&
                                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              doc.status === "rejected" &&
                                "bg-destructive/15 text-destructive",
                              doc.status === "pending" &&
                                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            )}
                          >
                            {tds(doc.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {doc.uploaderName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(format, doc.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-xs font-medium text-primary hover:underline underline-offset-2"
                          >
                            {t("viewDocument")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right: driver + customer */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("driverCard")}
            </h2>
            {driver ? (
              <div>
                <p className="font-medium">
                  <Link
                    href={`/drivers/${driver.id}`}
                    className="text-primary hover:underline underline-offset-2"
                  >
                    {driver.full_name ?? driver.email}
                  </Link>
                </p>
                {driver.email && (
                  <p className="text-sm text-muted-foreground">
                    {driver.email}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noDriver")}</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("customerCard")}
            </h2>
            {customer ? (
              <p className="font-medium">
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-primary hover:underline underline-offset-2"
                >
                  {customer.name}
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noCustomer")}</p>
            )}
          </div>

          {/* Tracking link */}
          {trip.tracking_token && (
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("trackingLinkTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("trackingLinkDesc")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const url = `${window.location.origin}/track/${trip.tracking_token}`;
                  void navigator.clipboard.writeText(url).then(() => {
                    setTrackingCopied(true);
                    toast.success(t("trackingLinkCopied"));
                    setTimeout(() => setTrackingCopied(false), 2000);
                  });
                }}
              >
                {trackingCopied ? (
                  t("trackingLinkCopiedShort")
                ) : (
                  <>
                    <Copy className="mr-1.5 size-4" />
                    {t("copyTrackingLink")}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Delivery signature */}
          {trip.delivery_signature_url && (
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <PenLine className="size-4" />
                {t("signatureTitle")}
              </h2>
              {trip.delivered_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(format, trip.delivered_at)}
                </p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trip.delivery_signature_url}
                alt={t("signatureAlt")}
                className="w-full rounded-lg border bg-white object-contain"
                style={{ maxHeight: 120 }}
              />
              <a
                href={trip.delivery_signature_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline underline-offset-2"
              >
                {t("signatureViewFull")}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
