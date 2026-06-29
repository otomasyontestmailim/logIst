-- Sefer: akaryakıt yüzdesi, okunabilir sefer numarası, fatura yönü (gelen/giden)

ALTER TABLE public.trips
  ADD COLUMN fuel_level smallint CHECK (fuel_level >= 0 AND fuel_level <= 100),
  ADD COLUMN trip_no text,
  ADD COLUMN invoice_direction text DEFAULT 'outgoing'
    CHECK (invoice_direction IN ('incoming', 'outgoing'));

-- Okunabilir, sıralı sefer numarası (SEF-001000, SEF-001001, ...)
CREATE SEQUENCE IF NOT EXISTS public.trips_no_seq START 1000;

CREATE OR REPLACE FUNCTION public.set_trip_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trip_no IS NULL OR btrim(NEW.trip_no) = '' THEN
    NEW.trip_no := 'SEF-' || to_char(nextval('public.trips_no_seq'), 'FM000000');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trip_no ON public.trips;
CREATE TRIGGER trg_set_trip_no
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_no();

-- Mevcut seferlere numara ata
UPDATE public.trips
SET trip_no = 'SEF-' || to_char(nextval('public.trips_no_seq'), 'FM000000')
WHERE trip_no IS NULL;
