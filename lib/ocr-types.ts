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
