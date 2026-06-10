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
import { ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { formatDate } from "@/lib/format-date";
import { updateTripStatus, type TripFormState } from "../(panel)/trips/actions";
import { createDocument, type DocumentFormState } from "./actions";
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

/** Şoförün tek tuşla ilerlettiği durum zinciri. */
const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  created: "loaded",
  loaded: "in_transit",
  in_transit: "delivered",
};

const STATUS_CLASSES: Record<string, string> = {
  created: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  loaded: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  in_transit:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  delivered:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const DOC_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-destructive/15 text-destructive",
};

export function DriverClient({
  trips,
  documents,
  customers,
  organizationId,
}: {
  trips: TripRow[];
  documents: DocumentRow[];
  customers: CustomerName[];
  organizationId: string;
}) {
  const t = useTranslations("Driver");

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
  organizationId,
}: {
  trip: TripRow;
  customerName: string | null;
  documents: DocumentRow[];
  organizationId: string;
}) {
  const t = useTranslations("Driver");
  const tt = useTranslations("Trips");
  const format = useFormatter();

  const [statusState, statusAction, statusPending] = useActionState(
    updateTripStatus,
    tripInitial,
  );

  useEffect(() => {
    if (statusState.ok && statusState.message === "updated") {
      toast.success(t("statusUpdated"));
    } else if (!statusState.ok && statusState.error) {
      toast.error(t("errorToast", { error: statusState.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState]);

  const next = NEXT_STATUS[trip.status];
  const nextLabel =
    next === "loaded"
      ? t("markLoaded")
      : next === "in_transit"
        ? t("markInTransit")
        : t("markDelivered");

  const statusLabel =
    trip.status === "created"
      ? tt("statusCreated")
      : trip.status === "loaded"
        ? tt("statusLoaded")
        : trip.status === "in_transit"
          ? tt("statusInTransit")
          : tt("statusDelivered");

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span>{trip.origin}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <span>{trip.destination}</span>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${STATUS_CLASSES[trip.status] ?? STATUS_CLASSES.created}`}
        >
          {statusLabel}
        </span>
      </div>

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

      {next && (
        <Button
          className="w-full"
          size="lg"
          disabled={statusPending}
          onClick={() => {
            const fd = new FormData();
            fd.set("trip_id", trip.id);
            fd.set("status", next);
            startTransition(() => statusAction(fd));
          }}
        >
          {statusPending ? t("saving") : nextLabel}
        </Button>
      )}

      <DocumentSection
        trip={trip}
        documents={documents}
        organizationId={organizationId}
      />
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
  const [docState, docAction, docPending] = useActionState(
    createDocument,
    docInitial,
  );

  useEffect(() => {
    if (docState.ok && docState.message === "created") {
      toast.success(t("uploadSuccess"));
    } else if (!docState.ok && docState.error) {
      toast.error(t("uploadError", { error: docState.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docState]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const supabase = createClient();
      const path = `${organizationId}/${trip.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) {
        toast.error(t("uploadError", { error: error.message }));
        return;
      }
      const fd = new FormData();
      fd.set("trip_id", trip.id);
      fd.set("type", docType);
      fd.set("file_path", path);
      startTransition(() => docAction(fd));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = uploading || docPending;

  return (
    <div className="space-y-3 border-t pt-3">
      <h3 className="text-sm font-semibold">{t("documentsTitle")}</h3>

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
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="size-4" />
          {busy ? t("uploading") : t("uploadDocument")}
        </Button>
      </div>
    </div>
  );
}
