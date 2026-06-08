-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  FlowGuard — FlowBond continuous security scan (read-only, run anytime)     ║
-- ║  One ranked result set: severity · category · object · detail.             ║
-- ║  CRITICAL = act now. WARN = review. INFO = confirm intent.                  ║
-- ║  A perfect run returns only INFO rows (intentional public data).           ║
-- ║  Run via Supabase MCP execute_sql or psql against the FlowBond project.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
with app_schemas as (
  select nspname from pg_namespace
  where nspname not in ('pg_catalog','information_schema','pg_toast','auth','storage',
        'extensions','graphql','graphql_public','realtime','vault','supabase_migrations','net','pgsodium','pgsodium_masks','cron')
    and nspname not like 'pg_%'
),

-- CRITICAL #1 — public/anon/authenticated can WRITE everything (the ops_* bug class)
public_write as (
  select 'CRITICAL' sev, 'public WRITE via RLS' cat,
         p.schemaname||'.'||p.tablename obj,
         'policy "'||p.policyname||'" ('||p.cmd||') lets '||array_to_string(p.roles,',')||' write any row (always-true)' det
  from pg_policies p join app_schemas s on s.nspname=p.schemaname
  where p.roles && array['public','anon','authenticated']::name[]
    and p.cmd in ('ALL','UPDATE','DELETE')
    and coalesce(p.qual,'true')='true' and coalesce(p.with_check,'true')='true'
),

-- CRITICAL #2 — RLS is OFF on a table anon/authenticated can reach
rls_off as (
  select distinct 'CRITICAL' sev, 'RLS disabled + grants' cat,
         c.relnamespace::regnamespace||'.'||c.relname obj,
         'RLS is DISABLED but anon/authenticated hold table grants — fully exposed' det
  from pg_class c join app_schemas s on s.nspname=c.relnamespace::regnamespace::text
  join information_schema.role_table_grants g on g.table_schema=c.relnamespace::regnamespace::text and g.table_name=c.relname
  where c.relkind='r' and not c.relrowsecurity
    and g.grantee in ('anon','authenticated') and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
),

-- WARN — security-definer views bypass the caller's RLS
definer_views as (
  select 'WARN' sev, 'security definer view' cat, n.nspname||'.'||c.relname obj,
         'view runs as owner (security_invoker not set) — bypasses caller RLS' det
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join app_schemas s on s.nspname=n.nspname
  where c.relkind='v'
    and not exists (select 1 from unnest(coalesce(c.reloptions,array[]::text[])) o where o ilike 'security_invoker=on' or o ilike 'security_invoker=true')
),

-- INFO — public READ (always-true SELECT). Often intentional public data; confirm.
public_read as (
  select 'INFO' sev, 'public READ (confirm intended)' cat,
         p.schemaname||'.'||p.tablename obj, 'policy "'||p.policyname||'" exposes all rows to '||array_to_string(p.roles,',') det
  from pg_policies p join app_schemas s on s.nspname=p.schemaname
  where p.roles && array['public','anon','authenticated']::name[]
    and p.cmd='SELECT' and coalesce(p.qual,'true')='true'
)

select sev as severity, cat as category, obj as object, det as detail
from (select * from public_write union all select * from rls_off
      union all select * from definer_views union all select * from public_read) x
order by array_position(array['CRITICAL','WARN','INFO'], sev), object;
