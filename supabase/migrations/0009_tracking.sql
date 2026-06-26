-- Müşteri takip linki için rastgele token
ALTER TABLE public.trips ADD COLUMN tracking_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX trips_tracking_token_idx ON public.trips(tracking_token);
