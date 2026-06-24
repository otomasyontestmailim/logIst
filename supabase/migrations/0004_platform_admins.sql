-- =====================================================================
-- 0004 — Platform admin (superadmin) modeli
--   Org rolünden BAĞIMSIZ platform yöneticiliği. public.users / org
--   üyeliğinden ayrı tutulur; organization_id NOT NULL kısıtına DOKUNMAZ.
--   Bir platform admin'in public.users satırı olmak zorunda değildir →
--   org'suz superadmin mümkün (Adım 5 seed bununla çözülür).
-- =====================================================================

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS: enable, policy YOK → normal istemci erişemez. Yalnızca service-role
-- ve aşağıdaki security-definer fonksiyon bu tabloyu okur.
alter table public.platform_admins enable row level security;

-- is_superadmin(): o anki kullanıcı platform admin mi?
-- current_org_id / current_user_role ile AYNI desen: security definer,
-- stable, sabit search_path. platform_admins üzerindeki RLS'i bypass eder
-- (policy'lerde çağrıldığında recursion / yetki sorununu önler).
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  )
$$;
