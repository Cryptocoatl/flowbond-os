-- ============================================================================
-- Reciprociudad — los nodos pasan por revisión antes de aparecer en el sitio.
--
-- Antes: `node_upsert` creaba el nodo en 'published' → salía al mapa al
-- instante y moderar significaba quitarlo después.
-- Ahora: nace en 'draft' y un admin (Steph o Fer) lo activa.
--
-- El dueño NUNCA queda fuera: `my_node` le sigue devolviendo su nodo aunque
-- esté en revisión, y puede seguir editándolo. Editar no reinicia la revisión
-- (el ON CONFLICT no toca `status`), así que aprobar es una sola vez.
-- ============================================================================

-- ── Alta = borrador (a revisión) ────────────────────────────────────────────
create or replace function public.reciprociudad_node_upsert(
  p_name text, p_kind text, p_description text,
  p_lat double precision, p_lng double precision,
  p_offers text, p_needs text, p_contact text
)
returns table (
  id uuid, name text, kind text, description text, lat double precision,
  lng double precision, offers text, needs text, contact text
)
language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_fbid uuid;
begin
  perform public.link_auth_or_create_identity();
  v_fbid := auth.uid();
  if v_fbid is null then raise exception 'not_authenticated'; end if;
  if coalesce(btrim(p_name),'') = '' then raise exception 'name_required'; end if;
  if p_kind not in ('comunidad','chinampa','bano_seco','huerto','negocio','tianguis','cultura','causa','otro') then
    raise exception 'invalid_kind';
  end if;

  return query
  insert into reciprociudad.reciprociudad_nodos as n
    (fbid, name, kind, description, lat, lng, offers, needs, contact, status)
  values (v_fbid, btrim(p_name), p_kind, nullif(btrim(p_description),''), p_lat, p_lng,
          nullif(btrim(p_offers),''), nullif(btrim(p_needs),''), nullif(btrim(p_contact),''),
          'draft')  -- ← a revisión; un admin lo activa desde /admin
  on conflict (fbid) where fbid is not null do update set
    name = excluded.name, kind = excluded.kind, description = excluded.description,
    lat = excluded.lat, lng = excluded.lng, offers = excluded.offers,
    needs = excluded.needs, contact = excluded.contact, updated_at = now()
    -- `status` deliberadamente ausente: editar no vuelve a mandar a revisión
    -- un nodo ya aprobado, ni auto-aprueba uno pendiente.
  returning n.id, n.name, n.kind, n.description, n.lat, n.lng, n.offers, n.needs, n.contact;
end $$;

-- ── El dueño ve en qué estado va el suyo ────────────────────────────────────
drop function if exists public.reciprociudad_my_node();
create function public.reciprociudad_my_node()
returns table (
  id uuid, name text, kind text, description text, lat double precision,
  lng double precision, offers text, needs text, contact text, status text
)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select id, name, kind, description, lat, lng, offers, needs, contact, status
  from reciprociudad.reciprociudad_nodos
  where fbid = auth.uid()
  limit 1;
$$;

-- ── Grants (Supabase concede EXECUTE a PUBLIC por defecto → revocar siempre) ─
revoke all on function public.reciprociudad_my_node() from public, anon;
grant execute on function public.reciprociudad_my_node() to authenticated, service_role;

revoke all on function public.reciprociudad_node_upsert(text, text, text, double precision, double precision, text, text, text)
  from public, anon;
grant execute on function public.reciprociudad_node_upsert(text, text, text, double precision, double precision, text, text, text)
  to authenticated, service_role;

-- ── Fer sube a super_admin (partner, no sólo editor) ────────────────────────
update reciprociudad.site_admins
   set rol = 'super_admin'
 where lower(email) = 'fernandokawoq@gmail.com';
