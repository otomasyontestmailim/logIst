import type { Metadata } from "next";
import { OfflinePageClient } from "./offline-client";

export const metadata: Metadata = {
  title: "Çevrimdışı — Lojistik CRM",
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
