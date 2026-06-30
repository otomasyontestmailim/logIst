-- Araç (kamyon/dorse) yönetimi: filo bilgileri + muayene/sigorta süreleri

CREATE TABLE public.vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plate         text NOT NULL,
  trailer_plate text,
  brand         text,
  model         text,
  year          int,
  capacity_ton  numeric(8,2),
  inspection_expiry  date,
  insurance_expiry   date,
  last_service_km    int,
  current_km         int,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org member" ON public.vehicles
  FOR ALL USING (organization_id = current_org_id());
CREATE INDEX vehicles_org_idx ON public.vehicles(organization_id);

-- Sefer ↔ araç bağlantısı
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id);
