-- =====================================================================
-- Lojistik CRM — Çekirdek şema + multi-tenant RLS
-- Faz 0: organizations, users, driver_profiles, customers, trips,
--        documents, audit_logs
-- =====================================================================

-- ---------- Uzantılar ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------- Enum tipleri ----------
create type public.user_role as enum ('admin', 'dispatcher', 'driver');
create type public.trip_status as enum ('created', 'loaded', 'in_transit', 'delivered');
create type public.document_type as enum (
  'cmr', 'invoice', 'waybill', 'weighbridge', 'adr', 'customs', 'delivery_note'
);
create type public.document_status as enum ('pending', 'approved', 'rejected');
create type public.customer_type as enum ('shipper', 'consignee', 'both');

-- =====================================================================
-- Tablolar
-- =====================================================================

-- ---------- organizations (kiracılar) ----------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tax_no      text,
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

-- ---------- users (auth.users'a 1-1) ----------
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            public.user_role not null default 'driver',
  full_name       text,
  email           text,
  phone           text,
  created_at      timestamptz not null default now()
);
create index users_org_idx on public.users(organization_id);

-- ---------- driver_profiles (şoför belge geçerlilikleri) ----------
create table public.driver_profiles (
  user_id            uuid primary key references public.users(id) on delete cascade,
  license_no         text,
  src_expiry         date,
  adr_expiry         date,
  psikoteknik_expiry date,
  green_card_expiry  date,
  plate              text,
  trailer_no         text
);

-- ---------- customers (gönderen / alıcı) ----------
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  type            public.customer_type not null default 'both',
  country         text,
  city            text,
  address         text,
  contact         text,
  created_at      timestamptz not null default now()
);
create index customers_org_idx on public.customers(organization_id);

-- ---------- trips (seferler) ----------
create table public.trips (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  driver_id       uuid references public.users(id) on delete set null,
  customer_id     uuid references public.customers(id) on delete set null,
  origin          text,
  destination     text,
  status          public.trip_status not null default 'created',
  load_date       date,
  delivery_date   date,
  created_at      timestamptz not null default now()
);
create index trips_org_idx on public.trips(organization_id);
create index trips_driver_idx on public.trips(driver_id);

-- ---------- documents (belgeler) ----------
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id         uuid not null references public.trips(id) on delete cascade,
  uploaded_by     uuid references public.users(id) on delete set null,
  type            public.document_type not null,
  file_url        text not null,
  page_count      int not null default 1,
  ocr_data        jsonb,
  status          public.document_status not null default 'pending',
  captured_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index documents_org_idx on public.documents(organization_id);
create index documents_trip_idx on public.documents(trip_id);

-- ---------- audit_logs (denetim kaydı) ----------
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  action          text not null,
  entity          text,
  entity_id       uuid,
  created_at      timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs(organization_id);

-- =====================================================================
-- Yardımcı fonksiyonlar (RLS için — security definer ile recursion'ı önler)
-- =====================================================================

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- =====================================================================
-- RLS — tüm tablolarda etkin
-- =====================================================================

alter table public.organizations  enable row level security;
alter table public.users           enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.customers       enable row level security;
alter table public.trips           enable row level security;
alter table public.documents       enable row level security;
alter table public.audit_logs      enable row level security;

-- ---------- organizations ----------
-- Üyeler kendi firmasını görür; yalnızca admin günceller.
create policy organizations_select on public.organizations
  for select using (id = public.current_org_id());
create policy organizations_update on public.organizations
  for update using (id = public.current_org_id() and public.current_user_role() = 'admin');

-- ---------- users ----------
-- Aynı firmadaki kullanıcıları herkes görebilir (panel için);
-- ekleme/güncelleme/silme yalnızca admin & dispatcher.
create policy users_select on public.users
  for select using (organization_id = public.current_org_id());
create policy users_insert on public.users
  for insert with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );
create policy users_update on public.users
  for update using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );
create policy users_delete on public.users
  for delete using (
    organization_id = public.current_org_id()
    and public.current_user_role() = 'admin'
  );

-- ---------- driver_profiles ----------
-- Şoför kendi profilini; admin/dispatcher firmadaki tüm profilleri görür.
create policy driver_profiles_select on public.driver_profiles
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
  );
create policy driver_profiles_write on public.driver_profiles
  for all using (
    exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
  );

-- ---------- customers ----------
create policy customers_select on public.customers
  for select using (organization_id = public.current_org_id());
create policy customers_write on public.customers
  for all using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  )
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );

-- ---------- trips ----------
-- Şoför yalnızca kendine atanan seferleri görür; admin/dispatcher hepsini.
create policy trips_select on public.trips
  for select using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() in ('admin', 'dispatcher')
      or driver_id = auth.uid()
    )
  );
create policy trips_write on public.trips
  for all using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  )
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );
-- Şoför yalnızca kendi seferinin durumunu güncelleyebilir.
create policy trips_driver_update on public.trips
  for update using (
    organization_id = public.current_org_id()
    and driver_id = auth.uid()
  )
  with check (
    organization_id = public.current_org_id()
    and driver_id = auth.uid()
  );

-- ---------- documents ----------
-- Şoför kendi seferinin/yüklediği belgeleri; admin/dispatcher firmadaki tümünü.
create policy documents_select on public.documents
  for select using (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() in ('admin', 'dispatcher')
      or uploaded_by = auth.uid()
      or exists (
        select 1 from public.trips t
        where t.id = documents.trip_id and t.driver_id = auth.uid()
      )
    )
  );
-- Şoför kendi seferine belge yükler.
create policy documents_insert on public.documents
  for insert with check (
    organization_id = public.current_org_id()
    and (
      public.current_user_role() in ('admin', 'dispatcher')
      or exists (
        select 1 from public.trips t
        where t.id = documents.trip_id and t.driver_id = auth.uid()
      )
    )
  );
-- Onay/red yalnızca admin/dispatcher.
create policy documents_update on public.documents
  for update using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  )
  with check (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );
create policy documents_delete on public.documents
  for delete using (
    organization_id = public.current_org_id()
    and public.current_user_role() in ('admin', 'dispatcher')
  );

-- ---------- audit_logs ----------
-- Yalnızca admin firmasının loglarını okur; yazma sunucu (service role) ile.
create policy audit_logs_select on public.audit_logs
  for select using (
    organization_id = public.current_org_id()
    and public.current_user_role() = 'admin'
  );
