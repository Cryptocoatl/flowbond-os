-- ============================================================================
-- Reciprociudad — acciones ejecutables por ClaudIA "de parte de" una persona.
--
-- El problema: los RPC de /admin se apoyan en auth.uid(), así que sólo corren
-- dentro de la sesión del navegador de un editor. La Consola de Construcción
-- corre del lado del servidor con service_role y NO tiene auth.uid().
--
-- La solución NO es que ClaudIA se haga pasar por alguien. Estos RPC reciben un
-- `p_actor` explícito, **verifican que esa persona sea editor activo**, y dejan
-- su nombre real en el historial. La consola ya autenticó a la persona antes de
-- llamar; aquí se vuelve a comprobar contra la base, así que un token de la
-- consola no alcanza para actuar como alguien que no tiene permiso.
--
-- EXECUTE sólo para service_role: nadie puede llamarlos desde el navegador.
-- ============================================================================

-- Verifica al actor y devuelve su correo (para el historial). Falla si no es editor.
create or replace function reciprociudad.agent_actor(p_actor uuid)
returns text language plpgsql stable security definer
set search_path = reciprociudad, public
as $$
declare v_email text;
begin
  if p_actor is null then raise exception 'actor requerido'; end if;
  select email into v_email
    from reciprociudad.site_admins
   where fbid = p_actor and activo;
  if v_email is null then raise exception 'el actor no es editor activo'; end if;
  return v_email;
end;
$$;

-- ── Moderar un nodo de la red viva ──────────────────────────────────────────
create or replace function public.reciprociudad_agent_node_set_status(
  p_actor uuid, p_id uuid, p_status text
) returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_email text := reciprociudad.agent_actor(p_actor);
begin
  if p_status not in ('published','draft') then raise exception 'estado inválido'; end if;
  update reciprociudad.reciprociudad_nodos
     set status = p_status, updated_at = now()
   where id = p_id;
  if not found then raise exception 'nodo no encontrado'; end if;

  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  values ('nodo:' || p_id::text, null, p_status, p_actor, v_email || ' (vía ClaudIA)');
end;
$$;

-- ── Editar un texto del sitio ───────────────────────────────────────────────
create or replace function public.reciprociudad_agent_content_set(
  p_actor uuid, p_key text, p_value text
) returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_email text := reciprociudad.agent_actor(p_actor);
  v_old   text;
begin
  if p_key is null or length(trim(p_key)) = 0 then raise exception 'key requerida'; end if;
  if length(p_value) > 8000 then raise exception 'texto demasiado largo'; end if;

  select value into v_old from reciprociudad.site_content where key = p_key;

  insert into reciprociudad.site_content (key, value, updated_by, updated_at)
  values (p_key, p_value, p_actor, now())
  on conflict (key) do update
    set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  values (p_key, v_old, p_value, p_actor, v_email || ' (vía ClaudIA)');
end;
$$;

-- ── Restaurar un texto a su original de diseño ──────────────────────────────
create or replace function public.reciprociudad_agent_content_reset(
  p_actor uuid, p_key text
) returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_email text := reciprociudad.agent_actor(p_actor);
  v_old   text;
begin
  select value into v_old from reciprociudad.site_content where key = p_key;
  if v_old is null then return; end if;

  delete from reciprociudad.site_content where key = p_key;
  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  values (p_key, v_old, null, p_actor, v_email || ' (vía ClaudIA)');
end;
$$;

-- ── Lecturas para que ClaudIA hable con datos, no con suposiciones ──────────
create or replace function public.reciprociudad_agent_overview(p_actor uuid)
returns table (
  nodos_publicados bigint, nodos_en_revision bigint,
  textos_editados bigint, imagenes_reemplazadas bigint,
  iniciativas bigint, cambios_ultimos_7d bigint
) language plpgsql security definer stable
set search_path = reciprociudad, public
as $$
begin
  perform reciprociudad.agent_actor(p_actor);
  return query
  select
    (select count(*) from reciprociudad.reciprociudad_nodos where status = 'published'),
    (select count(*) from reciprociudad.reciprociudad_nodos where status <> 'published'),
    (select count(*) from reciprociudad.site_content),
    (select count(*) from reciprociudad.site_media),
    (select count(*) from reciprociudad.site_iniciativas),
    (select count(*) from reciprociudad.site_content_history where at > now() - interval '7 days');
end;
$$;

create or replace function public.reciprociudad_agent_nodes(p_actor uuid)
returns table (id uuid, name text, kind text, status text, description text, created_at timestamptz)
language plpgsql security definer stable
set search_path = reciprociudad, public
as $$
begin
  perform reciprociudad.agent_actor(p_actor);
  return query
  select n.id, n.name, n.kind, n.status, n.description, n.created_at
  from reciprociudad.reciprociudad_nodos n
  order by (n.status <> 'published') desc, n.created_at desc;
end;
$$;

create or replace function public.reciprociudad_agent_history(p_actor uuid, p_limit int default 30)
returns table (key text, old_value text, new_value text, actor_email text, at timestamptz)
language plpgsql security definer stable
set search_path = reciprociudad, public
as $$
begin
  perform reciprociudad.agent_actor(p_actor);
  return query
  select h.key, h.old_value, h.new_value, h.actor_email, h.at
  from reciprociudad.site_content_history h
  order by h.at desc
  limit least(coalesce(p_limit, 30), 100);
end;
$$;

-- ── Grants: SÓLO service_role. Nada de esto es alcanzable desde el navegador ─
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure::text sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'reciprociudad\_agent\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
