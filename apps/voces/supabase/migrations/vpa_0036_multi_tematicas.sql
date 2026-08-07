-- vpa_0036_multi_tematicas — una voz puede pertenecer a VARIAS temáticas (2026-08-02)
-- APLICADA 2026-08-02. Renumerada de 0035 -> 0036: colisionaba con vpa_0035_commission_terms_no_fk.
-- APLICADA al canónico el 2026-08-02 (version 20260802204758).
-- Regla que manda: NADA se publica sin aprobación de Voces. Las temáticas viajan
-- por el mismo carril de moderación que el resto del perfil (app_vpa_change_requests
-- -> vpa_resolve_change -> vpa__apply_changes), como un campo más: `category_ids`.
-- `specialists.category_id` se mantiene sincronizado con la principal, así que
-- todo lo existente (alta, aprobación, filtros viejos) sigue funcionando.

create table if not exists public.app_vpa_specialist_categories (
  specialist_id uuid not null references public.app_vpa_specialists(id) on delete cascade,
  category_id   uuid not null references public.app_vpa_categories(id)  on delete cascade,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (specialist_id, category_id)
);
create index if not exists app_vpa_spec_cat_by_cat on public.app_vpa_specialist_categories(category_id);
create unique index if not exists app_vpa_spec_cat_one_primary
  on public.app_vpa_specialist_categories(specialist_id) where is_primary;

alter table public.app_vpa_specialist_categories enable row level security;
revoke all on table public.app_vpa_specialist_categories from anon, authenticated;

-- lo que ya tiene cada voz pasa a ser su temática principal
insert into public.app_vpa_specialist_categories (specialist_id, category_id, is_primary)
select s.id, s.category_id, true from public.app_vpa_specialists s where s.category_id is not null
on conflict (specialist_id, category_id) do nothing;

-- vista pública: sólo el cruce de voces publicadas, sin PII
create or replace view public.app_vpa_specialist_categories_public as
  select sc.specialist_id, sc.category_id, sc.is_primary
    from public.app_vpa_specialist_categories sc
    join public.app_vpa_specialists s on s.id = sc.specialist_id
   where s.status = 'published';
grant select on public.app_vpa_specialist_categories_public to anon, authenticated;

-- ---------------------------------------------------------------- helper --
-- Único lugar donde se escriben las temáticas. Sin auth: lo llaman el RPC de
-- admin y vpa__apply_changes (que ya validaron quién puede).
create or replace function public.vpa__set_spec_cats(p_spec uuid, p_ids uuid[], p_primary uuid default null)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare v_ids uuid[]; v_primary uuid; v_n int;
begin
  select array_agg(distinct c.id) into v_ids
    from unnest(coalesce(p_ids,'{}'::uuid[])) x(id)
    join public.app_vpa_categories c on c.id = x.id;
  v_n := coalesce(array_length(v_ids,1),0);
  if v_n = 0 then raise exception 'Elige al menos una temática'; end if;
  if v_n > 5 then raise exception 'Puedes elegir hasta 5 temáticas'; end if;
  v_primary := case when p_primary is not null and p_primary = any(v_ids) then p_primary else v_ids[1] end;

  delete from public.app_vpa_specialist_categories where specialist_id = p_spec;
  insert into public.app_vpa_specialist_categories (specialist_id, category_id, is_primary)
  select p_spec, x, (x = v_primary) from unnest(v_ids) x;

  update public.app_vpa_specialists set category_id = v_primary, updated_at = now() where id = p_spec;
  return v_ids;
end $$;
revoke all on function public.vpa__set_spec_cats(uuid, uuid[], uuid) from public, anon, authenticated;

-- ------------------------------------------------- aplicar cambios (patched)
-- Igual que antes + la llave especial `category_ids` (arreglo de uuid), que no
-- es una columna sino la tabla puente. Entra por el mismo camino aprobado.
create or replace function public.vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','badge_url','raw_photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order','country'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','preview_url','file_url','file_name',
                             'booking_url','booking_label','status_pill','sort_order',
                             'event_at','event_ends_at','event_location'];
  k text; sets text := ''; v_cats uuid[];
begin
  if p_changes is null or p_changes = '{}'::jsonb then return; end if;
  if p_offering is not null then
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(off_cols) then
        sets := sets || format('%I = (%L)::%s,', k,
          case when k in ('event_at','event_ends_at') then nullif(p_changes->>k,'') else p_changes->>k end,
          case k when 'price_cents' then 'int' when 'sort_order' then 'int'
                 when 'sell_via_voces' then 'boolean' when 'in_progress' then 'boolean'
                 when 'kind' then 'vpa_offering_type'
                 when 'event_at' then 'timestamptz' when 'event_ends_at' then 'timestamptz'
                 else 'text' end);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_offerings set ' || left(sets, length(sets)-1) || ' where id = $1' using p_offering;
    end if;
  else
    -- temáticas múltiples: se aplican primero para que category_id quede sincronizado
    if p_changes ? 'category_ids' and jsonb_typeof(p_changes->'category_ids') = 'array' then
      select array_agg((x)::uuid) into v_cats
        from jsonb_array_elements_text(p_changes->'category_ids') t(x)
       where x ~ '^[0-9a-fA-F-]{36}$';
      if coalesce(array_length(v_cats,1),0) > 0 then
        perform vpa__set_spec_cats(p_spec, v_cats,
          nullif(p_changes->>'category_primary','')::uuid);
      end if;
    end if;
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(spec_cols) then
        sets := sets || format('%I = (%L)::%s,', k, p_changes->>k,
          case k when 'category_id' then 'uuid' when 'available_now' then 'boolean'
                 when 'sort_order' then 'int' else 'text' end);
      elsif k = any(spec_arrs) then
        sets := sets || format('%I = (select coalesce(array_agg(x),''{}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', k, p_changes->k);
      elsif k = 'modalities' then
        sets := sets || format('modalities = (select coalesce(array_agg(x::vpa_modality),''{online}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', p_changes->k);
      elsif k = 'contact_socials' then
        sets := sets || format('contact_socials = coalesce(contact_socials,''{}''::jsonb) || (%L::jsonb),', p_changes->k);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_specialists set ' || left(sets, length(sets)-1) || ' where id = $1' using p_spec;
    end if;
  end if;
end $$;

-- ------------------------------------------------------- admin (inmediato) --
-- Mónica sí puede ajustar temáticas al momento: ella ES la validación.
create or replace function public.vpa_set_specialist_categories(p_specialist uuid, p_ids uuid[], p_primary uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_ids uuid[];
begin
  perform public.vpa_require(auth.uid(),'super_admin');
  if p_specialist is null then raise exception 'Falta el especialista'; end if;
  v_ids := public.vpa__set_spec_cats(p_specialist, p_ids, p_primary);
  perform public.vpa__audit('set_specialist_categories','specialist',p_specialist,
    jsonb_build_object('ids', to_jsonb(v_ids), 'by', auth.uid()));
  return jsonb_build_object('ok', true, 'ids', to_jsonb(v_ids));
end $$;
revoke all on function public.vpa_set_specialist_categories(uuid, uuid[], uuid) from public, anon;
grant execute on function public.vpa_set_specialist_categories(uuid, uuid[], uuid) to authenticated;

-- ------------------------------------------------------------------ lectura
create or replace function public.vpa_my_specialist_categories(p_specialist uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role vpa_role := public.vpa_role_of(auth.uid());
  v_spec uuid := coalesce(case when v_role = 'super_admin' then p_specialist else null end,
                          public.vpa__my_specialist());
begin
  if v_spec is null then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('category_id',category_id,'is_primary',is_primary) order by is_primary desc)
      from public.app_vpa_specialist_categories where specialist_id = v_spec), '[]'::jsonb);
end $$;
revoke all on function public.vpa_my_specialist_categories(uuid) from public, anon;
grant execute on function public.vpa_my_specialist_categories(uuid) to authenticated;
