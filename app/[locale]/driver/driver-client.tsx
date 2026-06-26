"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  ChevronDown,
  ImagePlus,
  ScanText,
} from "lucide-react";
import { MapView } from "@/components/map/map-view";
import { StopsTimeline } from "@/components/stops-timeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/image";
import { useUploadQueue } from "@/lib/use-upload-queue";
import { formatDate } from "@/lib/format-date";
import { updateTripStatus, type TripFormState } from "../(panel)/trips/actions";
import {
  rejectTrip,
  reportLocation,
  saveDeliverySignature,
  type DocumentFormState,
} from "./actions";
import { DRIVER_NEXT_STATUS, STATUS_CLASSES } from "@/lib/trip-status";
import { createClient } from "@/lib/supabase/client";
import { SignaturePad } from "@/components/signature-pad";
import dynamic from "next/dynamic";

// Scanner büyük (OpenCV.js) — yalnızca açıldığında yükle
const DocumentScanner = dynamic(
  () =>
    import("@/components/document-scanner").then((m) => ({
      default: m.DocumentScanner,
    })),
  { ssr: false },
);
import type {
  Database,
  DocumentType,
  TripStatus,
} from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type DocumentRow = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  "id" | "trip_id" | "type" | "status" | "created_at"
>;
type CustomerName = { id: string; name: string };

const DOCUMENT_TYPES: DocumentType[] = [
  "cmr",
  "invoice",
  "waybill",
  "weighbridge",
  "adr",
  "customs",
  "delivery_note",
];

/** Şoför aksiyon butonu etiketleri — hedef duruma göre. */
const ACTION_LABEL_KEYS: Partial<Record<TripStatus, string>> = {
  dispatched: "actionAccept",
  loading: "actionArrivedLoading",
  in_transit: "actionLoaded",
  delivering: "actionArrivedDelivery",
  delivery_approval: "actionDelivered",
};

const DOC_STATUS_CLASSES: Record<string, string> = {
  pending: "status-chip status-wait",
  approved: "status-chip status-done",
  rejected: "bg-destructive/15 text-destructive",
};

type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];

export function DriverClient({
  trips,
  documents,
  customers,
  stops,
  organizationId,
}: {
  trips: TripRow[];
  documents: DocumentRow[];
  customers: CustomerName[];
  stops: StopRow[];
  organizationId: string;
}) {
  const t = useTranslations("Driver");

  // PWA ön planda konum bildirimi: sayfa açıkken ~90 sn'de bir gönder.
  // İzin reddi/hata sessizce tolere edilir (toast spam yok).
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void reportLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      );
    };
    send();
    const id = setInterval(send, 90_000);
    return () => clearInterval(id);
  }, []);

  if (trips.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {t("noTrips")}
      </div>
    );
  }

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          customerName={
            trip.customer_id
              ? (customerMap.get(trip.customer_id) ?? null)
              : null
          }
          documents={documents.filter((d) => d.trip_id === trip.id)}
          stops={stops.filter((s) => s.trip_id === trip.id)}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}

const tripInitial: TripFormState = { ok: false };
const docInitial: DocumentFormState = { ok: false };

function TripCard({
  trip,
  customerName,
  documents,
  stops,
  organizationId,
}: {
  trip: TripRow;
  customerName: string | null;
  documents: DocumentRow[];
  stops: StopRow[];
  organizationId: string;
}) {
  const t = useTranslations("Driver");
  const tt = useTranslations("Trips");
  const tts = useTranslations("TripStatus");
  const format = useFormatter();

  const [statusState, statusAction, statusPending] = useActionState(
    updateTripStatus,
    tripInitial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectTrip,
    docInitial,
  );
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signaturePending, setSignaturePending] = useState(false);

  useEffect(() => {
    if (statusState.ok && statusState.message === "updated") {
      toast.success(t("statusUpdated"));
    } else if (!statusState.ok && statusState.error) {
      toast.error(t("errorToast", { error: statusState.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState]);

  useEffect(() => {
    if (rejectState.ok && rejectState.message === "rejected") {
      toast.success(t("rejectedToast"));
    } else if (!rejectState.ok && rejectState.error) {
      toast.error(t("errorToast", { error: rejectState.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectState]);

  const next = DRIVER_NEXT_STATUS[trip.status];
  const nextLabelKey = next ? ACTION_LABEL_KEYS[next] : undefined;
  const statusLabel = tts(trip.status);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span>{trip.origin}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <span>{trip.destination}</span>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${STATUS_CLASSES[trip.status] ?? STATUS_CLASSES.requested}`}
        >
          {statusLabel}
        </span>
      </div>

      {stops.some((s) => s.lat != null && s.lng != null) && (
        <MapView
          markers={stops
            .filter((s) => s.lat != null && s.lng != null)
            .map((s, i) => ({
              id: s.id,
              lat: Number(s.lat),
              lng: Number(s.lng),
              label: s.address ?? `${i + 1}`,
            }))}
          className="z-0 h-44 w-full rounded-lg border"
        />
      )}

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        {customerName && (
          <div className="col-span-2">
            {t("customer")}:{" "}
            <span className="text-foreground">{customerName}</span>
          </div>
        )}
        <div>
          {t("loadDate")}:{" "}
          <span className="text-foreground">
            {formatDate(format, trip.load_date)}
          </span>
        </div>
        <div>
          {t("deliveryDate")}:{" "}
          <span className="text-foreground">
            {formatDate(format, trip.delivery_date)}
          </span>
        </div>
      </div>

      {showSignaturePad && (
        <SignaturePad
          onClose={() => setShowSignaturePad(false)}
          onConfirm={async (blob) => {
            setSignaturePending(true);
            try {
              const supabase = createClient();
              const filePath = `${organizationId}/${trip.id}/signature.png`;
              const { error: storErr } = await supabase.storage
                .from("documents")
                .upload(filePath, blob, {
                  contentType: "image/png",
                  upsert: true,
                });
              if (storErr) {
                toast.error(t("errorToast", { error: storErr.message }));
                return;
              }
              const result = await saveDeliverySignature(trip.id, filePath);
              if (result.ok) {
                toast.success(t("signatureSaved"));
                setShowSignaturePad(false);
              } else {
                toast.error(
                  t("errorToast", { error: result.error ?? "unknown" }),
                );
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "upload_failed";
              toast.error(t("errorToast", { error: msg }));
            } finally {
              setSignaturePending(false);
            }
          }}
        />
      )}

      {next && nextLabelKey && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            size="lg"
            disabled={statusPending || rejectPending || signaturePending}
            onClick={() => {
              if (trip.status === "delivering") {
                setShowSignaturePad(true);
                return;
              }
              const fd = new FormData();
              fd.set("trip_id", trip.id);
              fd.set("status", next);
              startTransition(() => statusAction(fd));
            }}
          >
            {statusPending || signaturePending ? t("saving") : t(nextLabelKey)}
          </Button>
          {trip.status === "driver_approval" && (
            <Button
              variant="outline"
              size="lg"
              disabled={statusPending || rejectPending}
              onClick={() => {
                const fd = new FormData();
                fd.set("trip_id", trip.id);
                startTransition(() => rejectAction(fd));
              }}
            >
              {rejectPending ? t("saving") : t("actionReject")}
            </Button>
          )}
        </div>
      )}

      {(trip.cargo_type ||
        trip.tonnage_kg != null ||
        trip.notes ||
        stops.length > 0) && (
        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-semibold select-none">
            {t("detailsTitle")}
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t p-3 text-sm">
            {trip.cargo_type && (
              <DetailRow label={tt("cargoType")} value={trip.cargo_type} />
            )}
            {trip.loading_type && (
              <DetailRow label={tt("loadingType")} value={trip.loading_type} />
            )}
            {trip.tonnage_kg != null && (
              <DetailRow
                label={tt("tonnageKg")}
                value={format.number(Number(trip.tonnage_kg))}
              />
            )}
            {trip.tracking_no && (
              <DetailRow label={tt("trackingNo")} value={trip.tracking_no} />
            )}
            {trip.notes && (
              <p className="text-muted-foreground">{trip.notes}</p>
            )}
            {stops.length > 0 && (
              <div className="border-t pt-3">
                <StopsTimeline stops={stops} />
              </div>
            )}
          </div>
        </details>
      )}

      <details className="group rounded-lg border" open>
        <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-semibold select-none">
          {t("documentsTitle")}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t p-3">
          <DocumentSection
            trip={trip}
            documents={documents}
            organizationId={organizationId}
          />
        </div>
      </details>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DocumentSection({
  trip,
  documents,
  organizationId,
}: {
  trip: TripRow;
  documents: DocumentRow[];
  organizationId: string;
}) {
  const t = useTranslations("Driver");
  const tdt = useTranslations("DocumentTypes");
  const tds = useTranslations("DocumentStatus");

  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>("cmr");
  const [uploading, setUploading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { upload } = useUploadQueue();

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    try {
      const result = await upload({
        blob,
        tripId: trip.id,
        organizationId,
        docType,
      });
      if (result === "queued") {
        toast.info(t("uploadQueued"));
      } else {
        toast.success(t("uploadSuccess"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "upload_failed";
      toast.error(t("uploadError", { error: msg }));
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compressImage(file);
    await uploadBlob(blob);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleScanCapture(blob: Blob) {
    await uploadBlob(blob);
  }

  const busy = uploading;

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{tdt(doc.type)}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${DOC_STATUS_CLASSES[doc.status] ?? DOC_STATUS_CLASSES.pending}`}
              >
                {tds(doc.status)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <div className="space-y-1.5">
          <Label htmlFor={`doc-type-${trip.id}`}>{t("selectType")}</Label>
          <select
            id={`doc-type-${trip.id}`}
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            disabled={busy}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {tdt(dt)}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {/* Tarama + galeri butonları */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setScannerOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Camera className="size-6 animate-pulse" />
            ) : (
              <ScanText className="size-6" />
            )}
            {busy ? t("uploading") : t("scanDocument")}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Camera className="size-6 animate-pulse" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            {busy ? t("uploading") : t("addPhoto")}
          </button>
        </div>

        {/* Kenar tespitli tarayıcı modal */}
        {scannerOpen && (
          <DocumentScanner
            onCapture={handleScanCapture}
            onClose={() => setScannerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
