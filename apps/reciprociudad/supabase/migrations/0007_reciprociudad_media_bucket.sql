-- ============================================================================
-- Reciprociudad — public media bucket for images replaced from /admin.
--
-- Read: public (the images are on a public marketing page).
-- Write: ONLY an active reciprociudad.site_admins row. Anonymous visitors and
-- ordinary logged-in FBID holders cannot upload, overwrite or delete.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reciprociudad-media', 'reciprociudad-media', true, 10485760,
  array['image/webp','image/jpeg','image/png','image/avif','image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif','image/svg+xml'];

drop policy if exists reciprociudad_media_read   on storage.objects;
drop policy if exists reciprociudad_media_insert on storage.objects;
drop policy if exists reciprociudad_media_update on storage.objects;
drop policy if exists reciprociudad_media_delete on storage.objects;

create policy reciprociudad_media_read on storage.objects
  for select using (bucket_id = 'reciprociudad-media');

create policy reciprociudad_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reciprociudad-media'
    and reciprociudad.is_editor_uid(auth.uid())
  );

create policy reciprociudad_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reciprociudad-media'
    and reciprociudad.is_editor_uid(auth.uid())
  );

create policy reciprociudad_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reciprociudad-media'
    and reciprociudad.is_editor_uid(auth.uid())
  );

-- The storage RLS policies call this helper as the caller, so it must be
-- executable by them (it is SECURITY DEFINER and only ever returns a boolean).
grant execute on function reciprociudad.is_editor_uid(uuid) to authenticated;
