-- =====================================================================
-- 0002 — Storage: özel "documents" bucket'ı + RLS politikaları
-- =====================================================================
-- UYGULAMA: Supabase Dashboard → SQL Editor'da elle çalıştırılır
-- (CLI/MCP erişimi yok). 0001_init.sql uygulanmış olmalı
-- (current_org_id / current_user_role fonksiyonları kullanılıyor).
--
-- Path konvansiyonu: {organization_id}/{trip_id}/{uuid}.jpg
-- documents.file_url alanına bu storage path'i yazılır (URL değil);
-- görüntüleme her zaman imzalı URL ile yapılır (lib/supabase/storage.ts).

-- Bucket: private, 10 MB limit, yalnızca görüntü
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- NOT: storage.foldername(name) dosya adı HARİÇ klasör segmentlerini döner;
-- [1] = organization_id, [2] = trip_id.

-- Okuma: org üyesi yalnızca kendi firmasının klasörünü okur
-- (imzalı URL üretimi de bu politikadan geçer).
create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

-- Yükleme: admin/dispatcher kendi org klasörüne serbest;
-- şoför yalnızca kendisine atanmış seferin klasörüne yükler.
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
  );

-- Silme: yalnızca admin/dispatcher (reddedilen belge temizliği vb.)
create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_user_role() in ('admin', 'dispatcher')
  );
