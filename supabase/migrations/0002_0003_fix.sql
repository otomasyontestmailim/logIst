-- =====================================================================
-- 0002 + 0003 FIX — Kısmen uygulanmış migration'ların eksik parçaları
-- Güvenli: IF NOT EXISTS / DO $$ kullanır, tekrar çalıştırılabilir.
-- =====================================================================

-- ---- 0002 eksikleri: insert + delete policy ----
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'documents_storage_insert'
  ) then
    execute $p$
      create policy documents_storage_insert on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.current_org_id()::text
          and (
            public.current_user_role() in ('admin', 'dispatcher')
            or exists (
              select 1 from public.trips t
              where t.id::text = (storage.foldername(name))[2]
                and t.driver_id = auth.uid()
                and t.organization_id = public.current_org_id()
            )
          )
        )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'documents_storage_delete'
  ) then
    execute $p$
      create policy documents_storage_delete on storage.objects
        for delete to authenticated
        using (
          bucket_id = 'documents'
          and (storage.foldername(name))[1] = public.current_org_id()::text
          and public.current_user_role() in ('admin', 'dispatcher')
        )
    $p$;
  end if;
end $$;

-- ---- 0003 eksikleri: sütunlar IF NOT EXISTS ----

-- trips kolonları
alter table public.trips
  add column if not exists cargo_type   text,
  add column if not exists loading_type text,
  add column if not exists tonnage_kg   numeric,
  add column if not exists body_type    text,
  add column if not exists tracking_no  text,
  add column if not exists distance_km  numeric,
  add column if not exists notes        text;

-- driver_profiles araç bilgileri
alter table public.driver_profiles
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year  int,
  add column if not exists capacity_ton  numeric;

-- trip_stops tablosu
create table if not exists public.trip_stops (
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
create index if not exists trip_stops_trip_idx on public.trip_stops(trip_id);
create index if not exists trip_stops_org_idx on public.trip_stops(organization_id);

alter table public.trip_stops enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'trip_stops'
      and policyname = 'trip_stops_select'
  ) then
    execute $p$
      create policy trip_stops_select on public.trip_stops
        for select using (organization_id = public.current_org_id())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'trip_stops'
      and policyname = 'trip_stops_write'
  ) then
    execute $p$
      create policy trip_stops_write on public.trip_stops
        for all using (
          organization_id = public.current_org_id()
          and public.current_user_role() in ('admin', 'dispatcher')
        )
        with check (
          organization_id = public.current_org_id()
          and public.current_user_role() in ('admin', 'dispatcher')
        )
    $p$;
  end if;
end $$;

-- driver_locations tablosu
create table if not exists public.driver_locations (
  driver_id       uuid primary key references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lat             numeric not null,
  lng             numeric not null,
  recorded_at     timestamptz not null default now()
);
create index if not exists driver_locations_org_idx on public.driver_locations(organization_id);

alter table public.driver_locations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'driver_locations'
      and policyname = 'driver_locations_select'
  ) then
    execute $p$
      create policy driver_locations_select on public.driver_locations
        for select using (organization_id = public.current_org_id())
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'driver_locations'
      and policyname = 'driver_locations_insert'
  ) then
    execute $p$
      create policy driver_locations_insert on public.driver_locations
        for insert with check (
          driver_id = auth.uid() and organization_id = public.current_org_id()
        )
    $p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'driver_locations'
      and policyname = 'driver_locations_update'
  ) then
    execute $p$
      create policy driver_locations_update on public.driver_locations
        for update using (driver_id = auth.uid())
        with check (driver_id = auth.uid() and organization_id = public.current_org_id())
    $p$;
  end if;
end $$;

-- ---- trip_status enum kontrolü ----
-- Eğer enum zaten genişletilmişse bu DO bloğu atlanır.
do $$ begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trip_status'
      and e.enumlabel = 'delivery_approval'
  ) then
    raise exception 'trip_status enum hâlâ eski değerleri içeriyor — 0003 enum kısmı uygulanmamış! Lütfen manuel olarak uygulayın.';
  end if;
end $$;
