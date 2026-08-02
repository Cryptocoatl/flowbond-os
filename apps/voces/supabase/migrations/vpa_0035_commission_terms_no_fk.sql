-- ============================================================================
-- vpa_0035 — ⚠️ PENDIENTE DE APLICAR (falta acceso a la base)
--
-- Por qué: `app_vpa_commission_terms` es append-only (reglas no_delete/no_update)
-- y tiene FK a app_vpa_specialists. Es EXACTAMENTE la trampa que ya nos mordió
-- con `app_vpa_credits` el 2026-07-20: una voz que aceptó su comisión no se
-- podría borrar nunca ("referential integrity query gave unexpected result"),
-- y Mónica volvería a ver que "no se puede borrar".
--
-- Fix: quitar la FK. El ledger conserva el uuid como dato histórico (es un
-- registro de aceptación, no una relación viva) y borrar una voz nunca se traba.
-- ============================================================================

alter table public.app_vpa_commission_terms
  drop constraint if exists app_vpa_commission_terms_specialist_id_fkey;

comment on column public.app_vpa_commission_terms.specialist_id is
  'uuid del especialista al momento de aceptar. SIN FK a propósito: la tabla es append-only y una FK impediría borrar la voz (ver vpa_credits_fk_no_action, 2026-07-20).';

-- Comprobación: debe quedar 0 constraints de tipo FOREIGN KEY en la tabla.
-- select count(*) from pg_constraint
--  where conrelid = 'public.app_vpa_commission_terms'::regclass and contype = 'f';
