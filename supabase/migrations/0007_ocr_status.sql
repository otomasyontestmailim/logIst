-- =====================================================================
-- Migration 0007 — OCR durum takibi
-- Faz B: Manuel OCR tetikleme + durum izleme için
-- Elle SQL Editor'dan çalıştırılmalıdır.
-- =====================================================================

-- OCR durum enum'u
CREATE TYPE public.ocr_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- documents tablosuna yeni alanlar
ALTER TABLE public.documents
  ADD COLUMN ocr_status public.ocr_status NOT NULL DEFAULT 'pending',
  ADD COLUMN ocr_error  text;

-- İndeks (işlemekte olan belgeleri bulmak için)
CREATE INDEX documents_ocr_status_idx ON public.documents(ocr_status)
  WHERE ocr_status IN ('processing', 'failed');
