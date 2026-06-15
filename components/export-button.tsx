import { Download } from "lucide-react";

/** Dosya indirme bağlantısı (CSV/ZIP). Sunucu bileşeni — düz <a>, JS gerekmez. */
export function ExportButton({
  href,
  label,
  download,
}: {
  href: string;
  label: string;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      download={download}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}
