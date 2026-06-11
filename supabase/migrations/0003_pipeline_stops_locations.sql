-- =====================================================================
-- 0003 — TIRPORT tarzı taşıma yönetimi
--   a) trip_status enum'u 7+1 aşamaya genişletilir (eski 4 değer map'lenir)
--   b) trips: yük bilgisi kolonları
--   c) trip_stops: çoklu yükleme/teslim durakları
--   d) driver_locations: şoför başına tek satır son konum
--   e) driver_profiles: araç bilgisi kolonları
-- ÖNCE 0002 uygulanmış olmalı. Yazma trafiği yokken çalıştırın.
-- =====================================================================

-- ---------- a) trip_status enum genişletme ----------
alter type public.trip_status rename to trip_status_old;

create type public.trip_status as enum (
  'requested',          -- Taşıma Talepleri
  'driver_approval',    -- Sürücü Onayında
  'dispatched',         -- Sevk Aşamasında
  'loading',            -- Yükleme Aşamasında
  'in_transit',         -- Yoldaki Yükler
  'delivering',         -- Teslim Aşamasında
  'delivery_approval',  -- Teslimat Onayında
  'completed'           -- Tamamlandı (pipeline dışı, arşiv)
);

alter table public.trips alter column status drop default;
alter table public.trips alter column status type public.trip_status using (
  case status::text
    when 'created'    then 'requested'
    when 'loaded'     then 'loading'
    when 'in_transit' then 'in_transit'
    when 'delivered'  then 'delivery_approval'
  end
)::public.trip_status;
alter table public.trips alter column status set default 'requested';

drop type public.trip_status_old;

-- ---------- b) trips yük bilgisi kolonları ----------
alter table public.trips
  add column cargo_type   text,     -- yük türü (örn. Cam Ürünleri)
  add column loading_type text,     -- yükleme tipi (paletli / dökme / koli / diğer)
  add column tonnage_kg   numeric,  -- tonaj (kg)
  add column body_type    text,     -- kasa tipi
  add column tracking_no  text,     -- takip no
  add column distance_km  numeric,  -- mesafe (km) — karne toplam km için
  add column notes        text;     -- detay ve açıklamalar

-- ---------- c) trip_stops ----------
create table public.trip_stops (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id         uuid not null references public.trips(id) on delete cascade,
  seq             int  not null default 1,
  stop_type       text not null check (stop_type in ('pickup', 'delivery')),
  address         text,
  planned_at      timestamptz,
  actual_at       timestamptz,
  lat             numeric,
  lng             numeric,
  created_at      timestamptz not null default now()
);
create index trip_stops_trip_idx on public.trip_stops(trip_id);
create index trip_stops_org_idx on public.trip_stops(organization_id);

alter table public.trip_stops enable row level security;

-- Org üyesi okur (şoför kendi seferinin duraklarını da bu yolla görür)
create policy trip_stops_select on public.trip_stops
  for select using (organization_id = public.current_org_id());
-- Yazma yalnızca admin/dispatcher
create policy trip_stops_write on public.trip_stops
  for all using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  )
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );

-- ---------- d) driver_locations (şoför başına tek satır, upsert) ----------
create table public.driver_locations (
  driver_id       uuid primary key references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lat             numeric not null,
  lng             numeric not null,
  recorded_at     timestamptz not null default now()
);
create index driver_locations_org_idx on public.driver_locations(organization_id);

alter table public.driver_locations enable row level security;

-- Org üyesi okur (panel haritası)
create policy driver_locations_select on public.driver_locations
  for select using (organization_id = public.current_org_id());
-- Şoför yalnızca kendi satırını yazar
create policy driver_locations_insert on public.driver_locations
  for insert with check (
    driver_id = auth.uid() and organization_id = public.current_org_id()
  );
create policy driver_locations_update on public.driver_locations
  for update using (driver_id = auth.uid())
  with check (driver_id = auth.uid() and organization_id = public.current_org_id());

-- ---------- e) driver_profiles araç bilgileri ----------
alter table public.driver_profiles
  add column vehicle_model text,
  add column vehicle_year  int,
  add column capacity_ton  numeric;
