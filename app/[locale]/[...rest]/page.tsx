import { notFound } from "next/navigation";

// next-intl: bilinmeyen URL'lerin lokalize not-found sayfasına düşmesi için
// gerekli catch-all (bkz. next-intl docs "Not found page").
export default function CatchAllPage() {
  notFound();
}
