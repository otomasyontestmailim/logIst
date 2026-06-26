-- Navlun ücreti ve fatura durumu
ALTER TABLE public.trips
  ADD COLUMN freight_amount numeric(12,2),
  ADD COLUMN freight_currency text DEFAULT 'EUR',
  ADD COLUMN invoice_status text DEFAULT 'draft'
    CHECK (invoice_status IN ('draft','sent','paid'));
