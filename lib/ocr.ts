import "server-only";

// Yalnız tip — derlemede silinir, çalışma anında modül yüklenmez.
import type AnthropicSDK from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import type { DocumentType } from "@/lib/supabase/database.types";

// OCR ile çıkarılacak alanlar. Tümü string; bulunamayan alan "" döner.
// (Yapılandırılmış çıktı şeması strict olduğu için tüm alanlar required.)
export const OCR_FIELDS = [
  "sender",
  "receiver",
  "sender_address",
  "receiver_address",
  "document_number",
  "document_date",
  "total_amount",
  "currency",
  "gross_weight",
  "package_count",
  "plate",
  "summary",
] as const;

export type OcrField = (typeof OCR_FIELDS)[number];
export type OcrData = Record<OcrField, string>;

// Belge tipine göre modele kısa ipucu (hangi alanlar öne çıkar).
const TYPE_HINTS: Record<DocumentType, string> = {
  cmr: "CMR taşıma senedi: gönderen, alıcı, teslim yeri, kolİ/palet sayısı, brüt ağırlık.",
  invoice:
    "Fatura: gönderen/satıcı, alıcı, fatura no, tarih, toplam tutar, para birimi.",
  waybill: "İrsaliye: gönderen, alıcı, sevk tarihi, kalem/koli sayısı.",
  weighbridge: "Kantar fişi: brüt/dara/net ağırlık, plaka, tarih.",
  adr: "ADR belgesi: tehlikeli madde bilgisi, plaka, tarih.",
  customs: "Gümrük beyannamesi: beyanname no, gönderen, alıcı, tarih.",
  delivery_note:
    "Teslim tutanağı: teslim eden, teslim alan, tarih, koli sayısı.",
};

const OCR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    OCR_FIELDS.map((f) => [f, { type: "string" }]),
  ),
  required: [...OCR_FIELDS],
} as const;

const MEDIA_BY_EXT: Record<string, "image/jpeg" | "image/png" | "image/webp"> =
  {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

/**
 * Tek bir belge görüntüsünden alanları çıkarır (Claude Vision).
 * ANTHROPIC_API_KEY yoksa null döner (OCR sessizce atlanır).
 */
export async function extractDocumentFields(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  type: DocumentType,
): Promise<OcrData | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // SDK'yı yalnız OCR gerçekten çalışınca yükle (hot path'ten ve diğer
  // action modüllerinin grafiğinden uzak tut).
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const message = await client.messages.create({
    // Maliyet-odaklı OCR: Haiku görüntü + yapılandırılmış çıktı destekler,
    // belge alan çıkarımı için yeterli ve Opus'tan çok daha ucuz.
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "Sen bir lojistik belge okuma asistanısın. Verilen taranmış belgeden " +
      "istenen alanları çıkar. Emin olmadığın veya belgede olmayan alan için " +
      'boş string ("") döndür. Sayıları olduğu gibi (birim/sembol olmadan) yaz.',
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Belge tipi: ${type}. ${TYPE_HINTS[type]} Alanları çıkar.`,
          },
        ],
      },
    ],
    // Yapılandırılmış çıktı: yanıt tam olarak şemaya uyan JSON olur.
    output_config: { format: { type: "json_schema", schema: OCR_SCHEMA } },
  } as AnthropicSDK.MessageCreateParamsNonStreaming);

  const text = message.content
    .filter((b): b is AnthropicSDK.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    return JSON.parse(text) as OcrData;
  } catch {
    return null;
  }
}

/**
 * Bir belge kaydı için OCR çalıştırır ve `documents.ocr_data`'yı günceller.
 * En iyi çaba: hata yutulur, ana akışı bloklamaz. Başarıyı boolean döndürür.
 */
export async function runOcrForDocument(documentId: string): Promise<boolean> {
  if (!process.env.ANTHROPIC_API_KEY) return false;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id, type, file_url")
    .eq("id", documentId)
    .single();
  if (!doc) return false;

  const ext = doc.file_url.split(".").pop()?.toLowerCase() ?? "jpg";
  const mediaType = MEDIA_BY_EXT[ext] ?? "image/jpeg";

  const { data: file } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .download(doc.file_url);
  if (!file) return false;

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let fields: OcrData | null;
  try {
    fields = await extractDocumentFields(base64, mediaType, doc.type);
  } catch (err) {
    console.error("[ocr] çıkarım hatası:", err);
    return false;
  }
  if (!fields) return false;

  const { error } = await admin
    .from("documents")
    .update({ ocr_data: fields })
    .eq("id", documentId);
  return !error;
}
