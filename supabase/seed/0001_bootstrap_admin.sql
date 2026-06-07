-- =====================================================================
-- BOOTSTRAP — İlk firma (organization) + ilk admin kullanıcı
-- =====================================================================
-- NEDEN SQL EDITOR'DAN ÇALIŞTIRILIR:
--   organizations tablosunda INSERT politikası yoktur (kasıtlı). Normal
--   client RLS yüzünden ilk firmayı ekleyemez. SQL Editor postgres rolüyle
--   çalışır ve RLS'i bypass eder — bu yüzden ilk kayıt buradan atılır.
--
-- ÖN KOŞUL:
--   1. Supabase Dashboard → Authentication → Users → "Add user"
--      ile bir kullanıcı oluştur (e-posta + parola, "Auto Confirm" açık).
--   2. Aşağıdaki :admin_email değerini O kullanıcının e-postasıyla değiştir.
--   3. Bu dosyayı SQL Editor'da çalıştır.
-- =====================================================================

do $$
declare
  v_admin_email text := 'otomasyontestmailim@gmail.com'; -- bootstrap admin
  v_org_name    text := 'Demo Lojistik A.Ş.'; -- istersen değiştir
  v_uid  uuid;
  v_org  uuid;
begin
  -- auth.users içinden admin kullanıcının id'sini bul
  select id into v_uid from auth.users where email = v_admin_email;
  if v_uid is null then
    raise exception 'auth.users içinde % e-postalı kullanıcı yok. Önce Dashboard > Authentication > Add user ile oluştur.', v_admin_email;
  end if;

  -- Firma zaten kayıtlı mı? (idempotent)
  select id into v_org from public.organizations where name = v_org_name;
  if v_org is null then
    insert into public.organizations (name, plan)
    values (v_org_name, 'free')
    returning id into v_org;
  end if;

  -- public.users satırı (auth user <-> org eşleşmesi, rol = admin)
  insert into public.users (id, organization_id, role, full_name, email)
  values (v_uid, v_org, 'admin', 'Firma Yöneticisi', v_admin_email)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        role            = 'admin',
        email           = excluded.email;

  raise notice 'OK — org=% user=% (admin)', v_org, v_uid;
end $$;
