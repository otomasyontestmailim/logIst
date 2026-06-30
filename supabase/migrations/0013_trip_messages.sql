-- Şoför-dispatcher mesajlaşma: sefer bazlı sohbet

CREATE TABLE public.trip_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES public.users(id),
  content       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
-- Admin/dispatcher: kendi org mesajlarını görebilir
-- Şoför: kendi sefer mesajlarını görebilir
CREATE POLICY "org trip message access" ON public.trip_messages
  FOR ALL USING (organization_id = current_org_id());
CREATE INDEX trip_messages_trip_idx ON public.trip_messages(trip_id, created_at DESC);
