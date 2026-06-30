"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useErrorText } from "@/lib/use-error-text";
import {
  sendTripMessage,
  type TripFormState,
} from "@/app/[locale]/(panel)/trips/actions";

export type TripMessage = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  senderName: string;
};

const initial: TripFormState = { ok: false };

const POLL_INTERVAL_MS = 10_000;

export function TripMessagesClient({
  tripId,
  messages,
  currentUserId,
}: {
  tripId: string;
  messages: TripMessage[];
  currentUserId: string;
}) {
  const t = useTranslations("TripMessages");
  const format = useFormatter();
  const errText = useErrorText();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(sendTripMessage, initial);

  useEffect(() => {
    if (state.ok && state.message === "sent") {
      formRef.current?.reset();
      router.refresh();
    } else if (!state.ok && state.error && !state.fieldErrors) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Basit polling: 10 saniyede bir güncel mesajları çek.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("title")}
      </h2>

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col",
                  mine ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {mine ? t("you") : m.senderName} ·{" "}
                  {format.dateTime(new Date(m.created_at), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="trip_id" value={tripId} />
        <Textarea
          name="content"
          placeholder={t("placeholder")}
          rows={2}
          required
          className="flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending}
          aria-label={t("send")}
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
