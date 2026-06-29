-- 006_search_path_fix.sql
-- Pin search_path on two public functions to prevent search-path injection.
-- Fixes: function_search_path_mutable advisory (FG-004)

CREATE OR REPLACE FUNCTION public.flowbond_role_rank(p_role text)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SET search_path = public
AS $$
  select case p_role
    when 'viewer'     then 1
    when 'editor'     then 2
    when 'admin'      then 3
    when 'superadmin' then 4
    else 0 end;
$$;

CREATE OR REPLACE FUNCTION public.vpa__is_service()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path = public
AS $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role';
$$;
