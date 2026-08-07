-- vpa_0031 · Temáticas (1 ago 2026) — pedido de Mónica
--
-- Aplicada al canónico (fgsrcxxccdjqyrpkitmk) en dos partes:
--   vpa_0031a_category_upsert_hardening  (función)
--   vpa_0031b_categories_content_aug01   (datos)
--
-- CAUSA RAÍZ de los dos bugs reportados:
--   `app_vpa_categories.slug` es UNIQUE y el panel lo mandaba vacío. La primera
--   temática guardada sin slug ("Perdón y Duelo") quedó con slug='' y sin ícono
--   (círculo en blanco); la segunda ("Consultoría Empresarial") chocaba contra
--   ese '' y el guardado se quedaba cargando para siempre.
--   Ahora el slug se deriva del nombre, se desempata solo (-2, -3, …), y ninguna
--   temática puede quedar sin ícono ni sin nombre en inglés.

-- ============================================================
-- 0031a · función
-- ============================================================

create or replace function public.vpa__slugify(p text)
returns text language sql immutable set search_path to 'public' as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        lower(translate(coalesce(p,''),
          'áàäâãÁÀÄÂÃéèëêÉÈËÊíìïîÍÌÏÎóòöôõÓÒÖÔÕúùüûÚÙÜÛñÑçÇ',
          'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUnNcC')),
        '[^a-z0-9]+', '-', 'g')),
    '');
$$;
revoke execute on function public.vpa__slugify(text) from public, anon, authenticated;

create or replace function public.vpa_upsert_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      uuid := nullif(payload->>'id','')::uuid;
  v_name    text := nullif(trim(payload->>'name_es'),'');
  v_name_en text := nullif(trim(payload->>'name_en'),'');
  v_icon    text := nullif(trim(payload->>'icon'),'');
  v_slug    text := vpa__slugify(nullif(trim(payload->>'slug'),''));
  v_base    text;
  v_n       int := 1;
  -- ícono genérico (anillo) para que ninguna temática salga con el círculo vacío
  c_icon    constant text := '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>';
begin
  perform vpa_require(auth.uid(),'super_admin');

  if v_id is null and v_name is null then
    raise exception 'category_name_required';
  end if;

  -- El slug nunca queda vacío: si no lo escribieron, sale del nombre.
  if v_slug is null then
    v_slug := vpa__slugify(coalesce(v_name, (select name_es from app_vpa_categories where id = v_id)));
  end if;
  v_slug := coalesce(v_slug, 'tematica');

  -- …y nunca choca: se desempata con -2, -3, … en vez de reventar el guardado.
  v_base := v_slug;
  while exists (select 1 from app_vpa_categories c
                 where c.slug = v_slug and (v_id is null or c.id <> v_id)) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  if v_id is null then
    insert into app_vpa_categories (slug, icon, name_es, name_en, desc_es, desc_en, sort_order, status)
    values (v_slug,
            coalesce(v_icon, c_icon),
            v_name,
            coalesce(v_name_en, v_name),                      -- el sitio en inglés nunca sin nombre
            payload->>'desc_es',
            coalesce(nullif(trim(payload->>'desc_en'),''), payload->>'desc_es'),
            coalesce((payload->>'sort_order')::int, 0),
            coalesce((payload->>'status')::vpa_pub_status,'published'))
    returning id into v_id;
  else
    update app_vpa_categories set
      slug    = v_slug,
      icon    = coalesce(v_icon, nullif(trim(icon),''), c_icon),
      name_es = coalesce(v_name, name_es),
      name_en = coalesce(v_name_en, nullif(trim(name_en),''), v_name, name_es),
      desc_es = case when payload ? 'desc_es' then payload->>'desc_es' else desc_es end,
      desc_en = case when payload ? 'desc_en'
                     then coalesce(nullif(trim(payload->>'desc_en'),''),
                                   case when payload ? 'desc_es' then payload->>'desc_es' else desc_es end)
                     else desc_en end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order),
      status     = coalesce((payload->>'status')::vpa_pub_status, status)
    where id = v_id;
  end if;

  perform vpa__audit('upsert','category',v_id,payload);
  return v_id;
end;
$function$;

-- ============================================================
-- 0031b · datos
-- ============================================================

-- 1+4) "Perdón y Duelo" quedó a medias por el bug del slug: sin slug, sin ícono,
--      sin nombre en inglés y sin subtítulo. Se completa.
update public.app_vpa_categories set
  slug    = 'perdon-duelo',
  name_en = 'Forgiveness & Grief',
  desc_es = 'Libera el peso del pasado y sana tus heridas desde la raíz.',
  desc_en = 'Release the weight of the past and heal your wounds at the root.',
  icon    = '<path d="M12 15.4S7.1 12.7 5.7 9.7A3.4 3.4 0 0 1 12 7a3.4 3.4 0 0 1 6.3 2.7c-1.4 3-6.3 5.7-6.3 5.7Z"/><path d="M4 15.3c1.7 3 4.7 4.9 8 4.9s6.3-1.9 8-4.9"/>'
where id = '22704fe0-ce76-404c-a97a-b056844d1673';

-- 5) faltaba la palabra "Personal"
update public.app_vpa_categories set
  name_es = 'Liderazgo y Desarrollo Personal',
  name_en = 'Leadership & Personal Development'
where id = 'cb69f113-d966-42f0-bf15-69790a5e7ca8';

-- 3) "Sanación de Heridas" desaparece: su contenido vive ahora en "Perdón y Duelo".
--    Ningún especialista publicado la tenía; sí quedaba apuntada la solicitud
--    (ya aprobada) de ALVERA -> se reapunta antes de borrar para no romper la FK.
update public.app_vpa_applications
   set category_id = '22704fe0-ce76-404c-a97a-b056844d1673'
 where category_id = '4b854ee8-c9d4-4fb4-afa4-f8ec3789b04b';

update public.app_vpa_specialists
   set category_id = '22704fe0-ce76-404c-a97a-b056844d1673'
 where category_id = '4b854ee8-c9d4-4fb4-afa4-f8ec3789b04b';

delete from public.app_vpa_categories where id = '4b854ee8-c9d4-4fb4-afa4-f8ec3789b04b';

-- 2, 6, 7) temáticas nuevas
insert into public.app_vpa_categories (slug, icon, name_es, name_en, desc_es, desc_en, sort_order, status)
values
  ('consultoria-empresarial',
   '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2V8"/><path d="M3 13.2h18"/>',
   'Consultoría Empresarial', 'Business Consulting',
   'Lidera con propósito: construye negocios que también transforman vidas.',
   'Lead with purpose: build businesses that also transform lives.',
   10, 'published'),
  ('finanzas-nueva-economia',
   '<circle cx="12" cy="12" r="9"/><path d="M12 6.6v10.8"/><path d="M14.9 9.4a3 3 0 0 0-2.9-1.6c-1.7 0-2.9 1-2.9 2.3 0 3 5.9 1.7 5.9 4.7 0 1.4-1.2 2.4-3 2.4a3.3 3.3 0 0 1-3.1-1.7"/>',
   'Finanzas y Nueva Economía', 'Finance & the New Economy',
   'Construye abundancia y libertad financiera en la era digital.',
   'Build abundance and financial freedom in the digital era.',
   11, 'published'),
  ('sostenibilidad-vida-consciente',
   '<path d="M20 4c.7 7.7-3.8 13.2-9.5 13.2A5.5 5.5 0 0 1 5 11.7C5 6.6 11.6 4 20 4Z"/><path d="M9.8 20c.3-4.8 3-8.7 7.2-11"/>',
   'Sostenibilidad y Vida Consciente', 'Sustainability & Conscious Living',
   'Desde el alma, construimos y trabajamos por cuidar nuestro mundo.',
   'From the soul, we build and work to care for our world.',
   12, 'published');

-- Red de seguridad para lo ya guardado a medias por el bug anterior.
update public.app_vpa_categories
   set slug = vpa__slugify(name_es)
 where coalesce(trim(slug),'') = '';
update public.app_vpa_categories
   set icon = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>'
 where coalesce(trim(icon),'') = '';
update public.app_vpa_categories
   set name_en = name_es
 where coalesce(trim(name_en),'') = '';
