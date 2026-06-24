-- =====================================================================
-- 0006 — Storage policy'lerini platform admin (superadmin) için genişlet
--   Desen: bucket_id='documents' AND ( (mevcut org+şoför koşulu)
--                                       OR public.is_superadmin() )
--   Bucket kapsamı korunur (superadmin yalnız documents bucket'ında),
--   şoförün kendi seferine yükleme hakkı ve org klasör sınırı EZİLMEZ.
-- =====================================================================

-- Okuma: org üyesi kendi klasörü VEYA superadmin tüm documents klasörleri
alter policy documents_storage_select on storage.objects
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = public.current_org_id()::text
      or public.is_superadmin()
    )
  );

-- Yükleme: (org klasörü + admin/dispatcher VEYA atanmış şoför) VEYA superadmin
alter policy documents_storage_insert on storage.objects
  with check (
    bucket_id = 'documents'
    and (
      (
        (storage.foldername(name))[1] = public.current_org_id()::text
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
      or public.is_superadmin()
    )
  );

-- Silme: (org klasörü + admin/dispatcher) VEYA superadmin
alter policy documents_storage_delete on storage.objects
  using (
    bucket_id = 'documents'
    and (
      (
        (storage.foldername(name))[1] = public.current_org_id()::text
        and public.current_user_role() in ('admin', 'dispatcher')
      )
      or public.is_superadmin()
    )
  );
