-- =====================================================================
-- 0005 — Policy'leri platform admin (superadmin) için genişlet
--   Desen: her org-bazlı policy → "(mevcut koşul) OR public.is_superadmin()"
--   Normal kullanıcı kendi org'uyla sınırlı kalır (is_superadmin()=false).
--   Şoföre özel "kendi" yazma şeritleri (trips_driver_update,
--   driver_locations_insert/update) BİLEREK değiştirilmedi — ezilmesin diye;
--   superadmin onlara ayrı permissive policy'lerden (ALL/SELECT) erişir.
-- =====================================================================

-- ---------- organizations ----------
alter policy organizations_select on public.organizations
  using (id = public.current_org_id() or public.is_superadmin());
alter policy organizations_update on public.organizations
  using (
    (id = public.current_org_id() and public.current_user_role() = 'admin')
    or public.is_superadmin()
  );

-- ---------- users ----------
alter policy users_select on public.users
  using (organization_id = public.current_org_id() or public.is_superadmin());
alter policy users_insert on public.users
  with check (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );
alter policy users_update on public.users
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );
alter policy users_delete on public.users
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() = 'admin')
    or public.is_superadmin()
  );

-- ---------- driver_profiles ----------
alter policy driver_profiles_select on public.driver_profiles
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
    or public.is_superadmin()
  );
alter policy driver_profiles_write on public.driver_profiles
  using (
    exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
    or public.is_superadmin()
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = driver_profiles.user_id
        and u.organization_id = public.current_org_id()
        and public.current_user_role() in ('admin', 'dispatcher')
    )
    or public.is_superadmin()
  );

-- ---------- customers ----------
alter policy customers_select on public.customers
  using (organization_id = public.current_org_id() or public.is_superadmin());
alter policy customers_write on public.customers
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  )
  with check (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );

-- ---------- trips ----------
alter policy trips_select on public.trips
  using (
    (organization_id = public.current_org_id()
      and (public.current_user_role() in ('admin', 'dispatcher')
           or driver_id = auth.uid()))
    or public.is_superadmin()
  );
alter policy trips_write on public.trips
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  )
  with check (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );
-- trips_driver_update: DEĞİŞMEDEN (şoför kendi seferi).

-- ---------- documents ----------
alter policy documents_select on public.documents
  using (
    (organization_id = public.current_org_id()
      and (public.current_user_role() in ('admin', 'dispatcher')
           or uploaded_by = auth.uid()
           or exists (select 1 from public.trips t
                      where t.id = documents.trip_id and t.driver_id = auth.uid())))
    or public.is_superadmin()
  );
alter policy documents_insert on public.documents
  with check (
    (organization_id = public.current_org_id()
      and (public.current_user_role() in ('admin', 'dispatcher')
           or exists (select 1 from public.trips t
                      where t.id = documents.trip_id and t.driver_id = auth.uid())))
    or public.is_superadmin()
  );
alter policy documents_update on public.documents
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  )
  with check (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );
alter policy documents_delete on public.documents
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );

-- ---------- audit_logs ----------
alter policy audit_logs_select on public.audit_logs
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() = 'admin')
    or public.is_superadmin()
  );

-- ---------- trip_stops ----------
alter policy trip_stops_select on public.trip_stops
  using (organization_id = public.current_org_id() or public.is_superadmin());
alter policy trip_stops_write on public.trip_stops
  using (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  )
  with check (
    (organization_id = public.current_org_id()
      and public.current_user_role() in ('admin', 'dispatcher'))
    or public.is_superadmin()
  );

-- ---------- driver_locations ----------
alter policy driver_locations_select on public.driver_locations
  using (organization_id = public.current_org_id() or public.is_superadmin());
-- driver_locations_insert / driver_locations_update: DEĞİŞMEDEN (şoför kendi GPS'i).
