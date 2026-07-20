-- ════════════════════════════════════════════════════════════════════════
--  009_floguard_definer_views.sql  —  Fix security_definer_view ERRORs
--  (FG-054). Canonical project fgsrcxxccdjqyrpkitmk.
--
--  ⚠️ DRY-RUN — NOT auto-applied. Review impact carefully:
--    Converting a view from SECURITY DEFINER to SECURITY INVOKER means
--    queries run as the calling role, not the view owner. If anon/auth
--    roles lack SELECT on the underlying tables, those queries will fail.
--    Verify that underlying tables have appropriate RLS SELECT policies
--    before applying.
--
--  Views flagged (ERROR level) by Supabase advisors 2026-07-20:
--    public.v_ff_funding_progress
--    public.app_vpa_offerings_public
--    public.app_vpa_specialists_public
--    public.app_vpa_categories_public
--    public.app_vpa_workshops_public
--    public.app_vpa_products_public
--    public.app_vpa_services_public
--    public.app_vpa_testimonials_public
--    public.app_vpa_settings_public
-- ════════════════════════════════════════════════════════════════════════

-- ── FG-054 · convert security_definer views to security_invoker ───────────
-- Pre-flight: verify underlying tables have SELECT policies for anon/authenticated:
--   select schemaname, tablename, policyname, roles, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in (
--       -- fill in underlying tables used by each view
--     );

alter view public.v_ff_funding_progress        set (security_invoker = on);
alter view public.app_vpa_offerings_public     set (security_invoker = on);
alter view public.app_vpa_specialists_public   set (security_invoker = on);
alter view public.app_vpa_categories_public    set (security_invoker = on);
alter view public.app_vpa_workshops_public     set (security_invoker = on);
alter view public.app_vpa_products_public      set (security_invoker = on);
alter view public.app_vpa_services_public      set (security_invoker = on);
alter view public.app_vpa_testimonials_public  set (security_invoker = on);
alter view public.app_vpa_settings_public      set (security_invoker = on);
