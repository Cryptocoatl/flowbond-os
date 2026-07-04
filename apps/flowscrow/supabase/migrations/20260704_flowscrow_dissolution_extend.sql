-- Wires the already-migrated Phase A/B/C task tracker (20260624_flowscrow_init.sql)
-- into the live vault: adds code-gated read RPCs for tasks/events, a witness
-- attestation write path, a server-enforced hard block on the Certificate of
-- Termination task, and re-seeds the checklist to match the Mutual Dissolution,
-- Wind-Up and Release Agreement's Exhibit 3. All 18 existing flowscrow_tasks rows
-- are still 'pending' (untouched) at the time of writing, so replacing the seed
-- content loses no submitted/confirmed history.

-- ---------------------------------------------------------------------------
-- 1. Witness attribution (optional, nullable -- witnesses aren't required to log in)
-- ---------------------------------------------------------------------------

ALTER TABLE public.flowscrow_witnesses ADD COLUMN IF NOT EXISTS fbid_email text;

-- ---------------------------------------------------------------------------
-- 2. Code-gated read RPCs for the witness transparency view. Mirrors the
-- existing flowscrow_vault_witnesses()/flowscrow_vault_signatures() convention:
-- public read (anon+authenticated), no per-call code check -- the vault's
-- signatures/witnesses/comments are already world-readable "status page" tables
-- by design, and flowscrow_tasks/flowscrow_events for the single vault deal
-- follow the same posture. The witness page itself still requires entering a
-- valid code before rendering, matching the KeyVault UX.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.flowscrow_vault_tasks()
 RETURNS SETOF flowscrow_tasks
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.flowscrow_tasks
  WHERE deal_id = public.flowscrow_vault_deal()
  ORDER BY sort_order;
$function$;

GRANT EXECUTE ON FUNCTION public.flowscrow_vault_tasks() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.flowscrow_vault_events()
 RETURNS SETOF flowscrow_events
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.flowscrow_events
  WHERE deal_id = public.flowscrow_vault_deal()
  ORDER BY created_at;
$function$;

GRANT EXECUTE ON FUNCTION public.flowscrow_vault_events() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Witness attestation -- the new capability. Only a witness-kind code may
-- attest; appended to flowscrow_events (the existing append-only ledger --
-- no UPDATE/DELETE policy exists for it, matching the spec's "immutable event
-- log" requirement) as type='witness_attestation'.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.flowscrow_vault_attest(p_code text, p_phase text, p_note text)
 RETURNS flowscrow_events
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.flowscrow_access_codes; v_deal uuid; v_evt public.flowscrow_events;
BEGIN
  SELECT * INTO v FROM public.flowscrow_access_codes WHERE code = p_code;
  IF v.code IS NULL OR v.kind <> 'witness' THEN
    RAISE EXCEPTION 'only a witness code may attest';
  END IF;
  IF p_phase NOT IN ('A','B','C') THEN RAISE EXCEPTION 'invalid phase'; END IF;
  IF length(coalesce(trim(p_note),'')) = 0 THEN RAISE EXCEPTION 'empty attestation'; END IF;

  v_deal := public.flowscrow_vault_deal();
  IF v_deal IS NULL THEN RAISE EXCEPTION 'vault deal not found'; END IF;

  INSERT INTO public.flowscrow_events (deal_id, actor_fbid, actor_party_id, type, payload)
  VALUES (v_deal, NULL, NULL, 'witness_attestation',
    jsonb_build_object('witness_name', v.display_name, 'phase', p_phase, 'note', left(trim(p_note), 2000)))
  RETURNING * INTO v_evt;

  RETURN v_evt;
END $function$;

GRANT EXECUTE ON FUNCTION public.flowscrow_vault_attest(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Phase C hard block: Certificate of Termination (C3) cannot be submitted
-- or confirmed until both tax-clearance tasks (C1 final filings, C2 Certificate
-- of Account Status) are confirmed. Enforced server-side in the RPCs -- not
-- just hidden in the UI -- since these are the only write path for task state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.flowscrow_submit_task(p_task uuid)
 RETURNS flowscrow_tasks
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_t public.flowscrow_tasks; v_roles text[]; v_party uuid; v_ok boolean;
BEGIN
  SELECT * INTO v_t FROM public.flowscrow_tasks WHERE id = p_task;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF v_t.status <> 'pending' THEN RAISE EXCEPTION 'task not pending'; END IF;

  IF v_t.code = 'C3' AND EXISTS (
    SELECT 1 FROM public.flowscrow_tasks
    WHERE deal_id = v_t.deal_id AND code IN ('C1','C2') AND status <> 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Certificate of Termination is blocked until tax clearance (C1, C2) is confirmed';
  END IF;

  v_roles := public.flowscrow_my_roles(v_t.deal_id);
  IF v_t.responsible_role = 'all' THEN
    v_ok := array_length(v_roles,1) IS NOT NULL;
    v_party := (SELECT id FROM public.flowscrow_parties
                 WHERE deal_id=v_t.deal_id AND flowbond_user_id=auth.uid() LIMIT 1);
  ELSE
    v_ok := v_roles && ARRAY[v_t.responsible_role];
    v_party := public.flowscrow_my_party(v_t.deal_id, v_t.responsible_role);
  END IF;
  IF NOT v_ok THEN RAISE EXCEPTION 'not authorized: % may submit', v_t.responsible_role; END IF;

  UPDATE public.flowscrow_tasks
     SET status='submitted', submitted_by=v_party, submitted_at=now()
   WHERE id=p_task RETURNING * INTO v_t;
  PERFORM public.flowscrow__log(v_t.deal_id, v_party, 'task_submitted',
    jsonb_build_object('task_id', v_t.id, 'code', v_t.code));
  RETURN v_t;
END $function$;

CREATE OR REPLACE FUNCTION public.flowscrow_confirm_task(p_task uuid)
 RETURNS flowscrow_tasks
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_t public.flowscrow_tasks; v_roles text[]; v_party uuid; v_ok boolean;
BEGIN
  SELECT * INTO v_t FROM public.flowscrow_tasks WHERE id = p_task;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF v_t.status <> 'submitted' THEN RAISE EXCEPTION 'task not awaiting confirmation'; END IF;

  IF v_t.code = 'C3' AND EXISTS (
    SELECT 1 FROM public.flowscrow_tasks
    WHERE deal_id = v_t.deal_id AND code IN ('C1','C2') AND status <> 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Certificate of Termination is blocked until tax clearance (C1, C2) is confirmed';
  END IF;

  v_roles := public.flowscrow_my_roles(v_t.deal_id);
  IF v_t.verifier_role = 'both' THEN
    v_ok := v_roles && ARRAY['initiator','counterparty'];
    v_party := (SELECT id FROM public.flowscrow_parties
                 WHERE deal_id=v_t.deal_id AND flowbond_user_id=auth.uid()
                   AND role IN ('initiator','counterparty') LIMIT 1);
  ELSE
    v_ok := v_roles && ARRAY[v_t.verifier_role];
    v_party := public.flowscrow_my_party(v_t.deal_id, v_t.verifier_role);
  END IF;
  IF NOT v_ok THEN RAISE EXCEPTION 'not authorized: only % may confirm', v_t.verifier_label; END IF;

  IF v_party IS NOT NULL AND v_party = v_t.submitted_by THEN
    RAISE EXCEPTION 'self-confirmation is not allowed';
  END IF;

  UPDATE public.flowscrow_tasks
     SET status='confirmed', confirmed_by=v_party, confirmed_at=now()
   WHERE id=p_task RETURNING * INTO v_t;
  PERFORM public.flowscrow__log(v_t.deal_id, v_party, 'task_confirmed',
    jsonb_build_object('task_id', v_t.id, 'code', v_t.code));
  PERFORM public.flowscrow__recompute(v_t.deal_id);
  RETURN v_t;
END $function$;

-- ---------------------------------------------------------------------------
-- 5. Re-seed the checklist to match the Mutual Dissolution, Wind-Up and
-- Release Agreement's Exhibit 3 (was the older Separation & Transition
-- Agreement's Exhibit 3 -- stock power / individual key handoffs). Safe:
-- every row for this deal is still status='pending', none submitted/confirmed.
-- No wallet seeds/private keys stored anywhere -- key-handoff tasks (Coinbase)
-- get a boolean+timestamp only, exactly as the existing schema already enforces
-- (flowscrow_tasks has no key-shaped column).
-- ---------------------------------------------------------------------------

DO $$
DECLARE v_deal uuid;
BEGIN
  v_deal := public.flowscrow_vault_deal();
  IF v_deal IS NULL THEN
    RAISE NOTICE 'no vault deal found -- skipping task re-seed';
    RETURN;
  END IF;

  DELETE FROM public.flowscrow_tasks WHERE deal_id = v_deal;

  INSERT INTO public.flowscrow_tasks
    (deal_id, code, phase, sort_order, title, responsible_role, verifier_role,
     responsible_label, verifier_label, deliverable, acceptance_criteria)
  VALUES
    (v_deal,'A1','A',1,'Execute Agreement','all','counsel','Both Parties','Counsel',
      'Both Parties e-sign the Mutual Dissolution, Wind-Up and Release Agreement.', 'Signature recorded for both parties.'),
    (v_deal,'A2','A',2,'Consent to Dissolution','counterparty','initiator','Russell','Estefanía',
      'Russell signs Consent to Dissolution.', 'Signed consent on file.'),
    (v_deal,'A3','A',3,'Resignation','counterparty','initiator','Russell','Estefanía',
      'Russell signs resignation from all officer/director roles.', 'Signed resignation on file.'),
    (v_deal,'A4','A',4,'Brand waiver / assignment (Section 4)','counterparty','initiator','Russell','Estefanía',
      'Russell signs the brand waiver / IP assignment per Section 4.', 'Signed waiver on file.'),
    (v_deal,'A5','A',5,'Witnesses recorded; tracking opened','initiator','counsel','Estefanía','Counsel',
      'All named witnesses issued access and phase tracking is live.', 'Witness list confirmed; tracker accessible.'),

    (v_deal,'B1','B',6,'Domains → Namecheap "stepbysteph"','counterparty','initiator','Russell','Estefanía',
      'Transfer/auth+EPP for flowbond.tech, danz.now, flowb.me, pee.network.', 'All four domains confirmed under stepbysteph.'),
    (v_deal,'B2','B',7,'FlowBond Tech GitHub org','counterparty','initiator','Russell','Estefanía',
      'Former FlowBond Tech GitHub org transferred to Estefanía or archived + marked non-living.', 'Org state confirmed.'),
    (v_deal,'B3','B',8,'Mercury','counterparty','initiator','Russell','Estefanía',
      'Russell removed from Mercury.', 'Access removal confirmed.'),
    (v_deal,'B4','B',9,'Stripe','counterparty','initiator','Russell','Estefanía',
      'Ownership transferred to Estefanía; Russell removed.', 'Ownership + removal confirmed.'),
    (v_deal,'B5','B',10,'Coinbase','counterparty','initiator','Russell','Estefanía',
      'Russell removed; any key handoff occurs via secure out-of-platform channel (never recorded here).', 'Removal confirmed; boolean+timestamp only, no key material.'),
    (v_deal,'B6','B',11,'Telegram / Base App / Farcaster / social','counterparty','initiator','Russell','Estefanía',
      'Accounts transferred or de-identified.', 'Each account confirmed transferred or de-identified.'),
    (v_deal,'B7','B',12,'Estefanía confirms Phase B complete','initiator','counsel','Estefanía','Counsel',
      'All Phase B items verified complete.', 'Counsel sign-off recorded.'),

    (v_deal,'C1','C',13,'Final tax filings','counsel','initiator','Counsel','Estefanía',
      'Final federal (1120) and TX final franchise tax filed.', 'Filing confirmations on file.'),
    (v_deal,'C2','C',14,'Certificate of Account Status','counsel','initiator','Counsel','Estefanía',
      'TX Comptroller Certificate of Account Status obtained.', 'Certificate on file.'),
    (v_deal,'C3','C',15,'Certificate of Termination','counsel','initiator','Counsel','Estefanía',
      'Certificate of Termination filed with TX SOS. Blocked until C1 and C2 are confirmed.', 'Filed certificate on file; server-enforced ordering.'),
    (v_deal,'C4','C',16,'All accounts closed','counterparty','initiator','Russell','Estefanía',
      'Every remaining account (financial, social, infra) fully closed.', 'Closure confirmed across the list.'),
    (v_deal,'C5','C',17,'Dissolution & release effective','counsel','both','Counsel','Both Parties',
      'Dissolution effective; mutual release effective; witnesses attest completion; escrow releases.', 'Effective date recorded; escrow released.'),
    (v_deal,'C6','C',18,'On-chain anchor (optional)','initiator','initiator','Estefanía','Estefanía',
      'Optional: anchor a phase-completion hash on Base via EAS as proof-of-existence (not a legal signature).', 'Anchor tx recorded, if used.');
END $$;
