-- ePOD: teslimat imzası ve teslim zamanı
ALTER TABLE public.trips
  ADD COLUMN delivery_signature_url text,
  ADD COLUMN delivered_at timestamptz;
