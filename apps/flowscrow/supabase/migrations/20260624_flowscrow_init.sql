-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : 20260624_flowscrow_init.sql
-- Project   : fgsrcxxccdjqyrpkitmk  (us-east-2, "FlowBond-life")  — NEVER eoajujwpdkfuicnoxetk
-- App       : FlowScrow  ·  flowme.one/separationagreement
-- Purpose   : Conditional-release escrow that closes a multi-task agreement only
--             when every Exhibit-3 task is completed AND independently verified.
--
-- Pattern A: prefixed tables in `public`, RLS on, writes through SECURITY DEFINER
-- RPCs that enforce role rules server-side (no self-confirm; verifier-only confirm).
--
-- Adds 6 tables · helper fns · RLS · write RPCs · extends the app_slug allow-list
-- to include 'flowscrow' (required or activate_app('flowscrow') would fail) ·
-- seeds the first deal (FlowBond Tech / Russell Herod separation, Exhibit 3).
--
-- Idempotent: safe to re-run. Seed guarded by deal title.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. App registry allow-list — add 'flowscrow' (preserve every existing slug)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'flowbond_app_connections'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%app_slug%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.flowbond_app_connections DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE public.flowbond_app_connections
    ADD CONSTRAINT flowbond_app_connections_app_slug_check
    CHECK (app_slug = ANY (ARRAY[
      'flowgarden','danz','xelva','mountaindogs','flownation','flowbond',
      'astroflow','deck','ops','flowme','fbid','flow3','claudia','banoseco',
      'flowscrow'
    ]));
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.flowscrow_deals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  status           text        NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','signed_pending_transfers','cleared','released','anchored')),
  effective_date   date,
  counsel_approved boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flowscrow_parties (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id              uuid NOT NULL REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  flowbond_user_id     uuid REFERENCES public.flowbond_users(id) ON DELETE SET NULL,
  role                 text NOT NULL CHECK (role IN ('initiator','counterparty','counsel')),
  display_name         text,
  email                text,            -- used to claim the party slot on first login
  fbid                 uuid,            -- current_fbid() snapshot, for the audit log
  wallet_address       text,            -- optional, non-custodial; address only
  docusign_recipient_id text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, role)
);
CREATE INDEX IF NOT EXISTS flowscrow_parties_deal_idx ON public.flowscrow_parties (deal_id);
CREATE INDEX IF NOT EXISTS flowscrow_parties_user_idx ON public.flowscrow_parties (flowbond_user_id);
CREATE INDEX IF NOT EXISTS flowscrow_parties_email_idx ON public.flowscrow_parties (lower(email));

CREATE TABLE IF NOT EXISTS public.flowscrow_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid NOT NULL REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('agreement','courtesy_letter')),
  docusign_envelope_id text,
  status              text NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','sent','delivered','completed','declined','voided')),
  sha256              text,
  released            boolean NOT NULL DEFAULT false,
  released_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, kind)
);
CREATE INDEX IF NOT EXISTS flowscrow_documents_deal_idx ON public.flowscrow_documents (deal_id);

CREATE TABLE IF NOT EXISTS public.flowscrow_tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id            uuid NOT NULL REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  code               text NOT NULL,                       -- A1, B3, C2 …
  phase              text NOT NULL CHECK (phase IN ('A','B','C')),
  sort_order         int  NOT NULL DEFAULT 0,
  title              text NOT NULL,
  -- normalized party role that MAY act / verify:
  responsible_role   text NOT NULL CHECK (responsible_role IN ('initiator','counterparty','counsel','all')),
  verifier_role      text NOT NULL CHECK (verifier_role    IN ('initiator','counterparty','counsel','both')),
  responsible_label  text,                                -- human label e.g. 'Herod', 'Ferrera/Company'
  verifier_label     text,                                -- human label e.g. 'Counsel', 'Ferrera'
  deliverable        text,
  acceptance_criteria text,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','confirmed')),
  submitted_by       uuid REFERENCES public.flowscrow_parties(id),
  submitted_at       timestamptz,
  confirmed_by       uuid REFERENCES public.flowscrow_parties(id),
  confirmed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, code)
);
CREATE INDEX IF NOT EXISTS flowscrow_tasks_deal_idx ON public.flowscrow_tasks (deal_id, phase, sort_order);

-- Append-only audit log. No UPDATE / DELETE policy is ever granted → immutable.
CREATE TABLE IF NOT EXISTS public.flowscrow_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        uuid NOT NULL REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  actor_fbid     uuid,            -- current_fbid() of the actor
  actor_party_id uuid REFERENCES public.flowscrow_parties(id),
  type           text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flowscrow_events_deal_idx ON public.flowscrow_events (deal_id, created_at);

CREATE TABLE IF NOT EXISTS public.flowscrow_anchors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      uuid NOT NULL REFERENCES public.flowscrow_deals(id) ON DELETE CASCADE,
  chain        text NOT NULL DEFAULT 'base',
  tx_hash      text,
  package_hash text,             -- keccak256(agreement.sha256 ‖ letter.sha256 ‖ tasksHash)
  anchored_by  uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flowscrow_anchors_deal_idx ON public.flowscrow_anchors (deal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS  (SECURITY DEFINER → bypass RLS, so safe to call inside policies)
-- ─────────────────────────────────────────────────────────────────────────────

-- Roles the current session holds in a deal (a person can hold more than one).
CREATE OR REPLACE FUNCTION public.flowscrow_my_roles(p_deal uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::text[])
  FROM public.flowscrow_parties
  WHERE deal_id = p_deal AND flowbond_user_id = auth.uid();
$$;

-- Is the current session a party/counsel on this deal?
CREATE OR REPLACE FUNCTION public.flowscrow_can_see(p_deal uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flowscrow_parties
    WHERE deal_id = p_deal AND flowbond_user_id = auth.uid()
  );
$$;

-- The caller's party id for a given role in a deal (NULL if not held).
CREATE OR REPLACE FUNCTION public.flowscrow_my_party(p_deal uuid, p_role text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.flowscrow_parties
  WHERE deal_id = p_deal AND flowbond_user_id = auth.uid() AND role = p_role
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.flowscrow_deals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_parties   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowscrow_anchors   ENABLE ROW LEVEL SECURITY;

-- Service role: full access on every table (server-side trusted writes).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['flowscrow_deals','flowscrow_parties','flowscrow_documents',
                           'flowscrow_tasks','flowscrow_events','flowscrow_anchors']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_all ON public.%I', t);
    EXECUTE format('CREATE POLICY service_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Authenticated read access (parties + counsel only). No client INSERT/UPDATE/DELETE
-- policies → every mutation flows through the SECURITY DEFINER RPCs below.
DROP POLICY IF EXISTS deals_read ON public.flowscrow_deals;
CREATE POLICY deals_read ON public.flowscrow_deals
  FOR SELECT TO authenticated USING (public.flowscrow_can_see(id));

DROP POLICY IF EXISTS parties_read ON public.flowscrow_parties;
CREATE POLICY parties_read ON public.flowscrow_parties
  FOR SELECT TO authenticated USING (public.flowscrow_can_see(deal_id));

DROP POLICY IF EXISTS tasks_read ON public.flowscrow_tasks;
CREATE POLICY tasks_read ON public.flowscrow_tasks
  FOR SELECT TO authenticated USING (public.flowscrow_can_see(deal_id));

DROP POLICY IF EXISTS events_read ON public.flowscrow_events;
CREATE POLICY events_read ON public.flowscrow_events
  FOR SELECT TO authenticated USING (public.flowscrow_can_see(deal_id));

DROP POLICY IF EXISTS anchors_read ON public.flowscrow_anchors;
CREATE POLICY anchors_read ON public.flowscrow_anchors
  FOR SELECT TO authenticated USING (public.flowscrow_can_see(deal_id));

-- Documents: parties may read the row, EXCEPT the courtesy letter is hidden from the
-- counterparty until it is released. Initiator (author) + counsel always see it.
DROP POLICY IF EXISTS documents_read ON public.flowscrow_documents;
CREATE POLICY documents_read ON public.flowscrow_documents
  FOR SELECT TO authenticated USING (
    public.flowscrow_can_see(deal_id)
    AND (
      kind <> 'courtesy_letter'
      OR released = true
      OR (public.flowscrow_my_roles(deal_id) && ARRAY['initiator','counsel'])
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INTERNAL: event logging + status recompute
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.flowscrow__log(p_deal uuid, p_party uuid, p_type text, p_payload jsonb)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.flowscrow_events (deal_id, actor_fbid, actor_party_id, type, payload)
  VALUES (p_deal, public.current_fbid(), p_party, p_type, COALESCE(p_payload, '{}'::jsonb));
$$;

-- Advance to 'cleared' the moment every Phase-B task is confirmed AND counsel approved.
CREATE OR REPLACE FUNCTION public.flowscrow__recompute(p_deal uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status   text;
  v_approved boolean;
  v_b_total  int;
  v_b_done   int;
BEGIN
  SELECT status, counsel_approved INTO v_status, v_approved
  FROM public.flowscrow_deals WHERE id = p_deal;

  SELECT count(*) FILTER (WHERE phase='B'),
         count(*) FILTER (WHERE phase='B' AND status='confirmed')
    INTO v_b_total, v_b_done
  FROM public.flowscrow_tasks WHERE deal_id = p_deal;

  IF v_status = 'signed_pending_transfers'
     AND v_approved
     AND v_b_total > 0
     AND v_b_done = v_b_total THEN
    UPDATE public.flowscrow_deals SET status='cleared', updated_at=now() WHERE id=p_deal;
    PERFORM public.flowscrow__log(p_deal, NULL, 'deal_cleared',
      jsonb_build_object('b_tasks', v_b_total));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. WRITE RPCs (authenticated, role-enforced)
-- ─────────────────────────────────────────────────────────────────────────────

-- Link this login to its party slot by matching email (first login). Idempotent.
CREATE OR REPLACE FUNCTION public.flowscrow_claim_party()
RETURNS SETOF public.flowscrow_parties
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  UPDATE public.flowscrow_parties p
     SET flowbond_user_id = v_uid,
         fbid = public.current_fbid()
   WHERE p.flowbond_user_id IS NULL
     AND p.email IS NOT NULL
     AND lower(p.email) = lower(v_email);

  RETURN QUERY
    SELECT * FROM public.flowscrow_parties
    WHERE flowbond_user_id = v_uid;
END $$;

-- Open the transfer phase once the agreement + letter are signed into escrow (A-phase).
-- Counsel-only. draft → signed_pending_transfers.
CREATE OR REPLACE FUNCTION public.flowscrow_open_transfers(p_deal uuid)
RETURNS public.flowscrow_deals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_party uuid; v_deal public.flowscrow_deals;
BEGIN
  v_party := public.flowscrow_my_party(p_deal, 'counsel');
  IF v_party IS NULL THEN RAISE EXCEPTION 'counsel only'; END IF;
  UPDATE public.flowscrow_deals
     SET status='signed_pending_transfers', updated_at=now()
   WHERE id=p_deal AND status='draft'
   RETURNING * INTO v_deal;
  IF v_deal.id IS NULL THEN RAISE EXCEPTION 'deal not in draft'; END IF;
  PERFORM public.flowscrow__log(p_deal, v_party, 'transfers_opened', '{}'::jsonb);
  RETURN v_deal;
END $$;

-- Responsible party marks a task delivered (pending → submitted).
CREATE OR REPLACE FUNCTION public.flowscrow_submit_task(p_task uuid)
RETURNS public.flowscrow_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t public.flowscrow_tasks; v_roles text[]; v_party uuid; v_ok boolean;
BEGIN
  SELECT * INTO v_t FROM public.flowscrow_tasks WHERE id = p_task;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF v_t.status <> 'pending' THEN RAISE EXCEPTION 'task not pending'; END IF;

  v_roles := public.flowscrow_my_roles(v_t.deal_id);
  IF v_t.responsible_role = 'all' THEN
    v_ok := array_length(v_roles,1) IS NOT NULL;          -- any party
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
END $$;

-- Named verifier confirms a submitted task (submitted → confirmed). NO self-confirm.
CREATE OR REPLACE FUNCTION public.flowscrow_confirm_task(p_task uuid)
RETURNS public.flowscrow_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t public.flowscrow_tasks; v_roles text[]; v_party uuid; v_ok boolean;
BEGIN
  SELECT * INTO v_t FROM public.flowscrow_tasks WHERE id = p_task;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF v_t.status <> 'submitted' THEN RAISE EXCEPTION 'task not awaiting confirmation'; END IF;

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

  -- No self-confirmation: the verifier may not be the party who submitted it.
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
END $$;

-- Counsel records approval (the gate). Recompute may flip the deal to 'cleared'.
CREATE OR REPLACE FUNCTION public.flowscrow_counsel_approve(p_deal uuid)
RETURNS public.flowscrow_deals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_party uuid; v_deal public.flowscrow_deals;
BEGIN
  v_party := public.flowscrow_my_party(p_deal, 'counsel');
  IF v_party IS NULL THEN RAISE EXCEPTION 'counsel only'; END IF;
  UPDATE public.flowscrow_deals SET counsel_approved=true, updated_at=now()
   WHERE id=p_deal RETURNING * INTO v_deal;
  PERFORM public.flowscrow__log(p_deal, v_party, 'counsel_approved', '{}'::jsonb);
  PERFORM public.flowscrow__recompute(p_deal);
  SELECT * INTO v_deal FROM public.flowscrow_deals WHERE id=p_deal;
  RETURN v_deal;
END $$;

-- Counsel/escrow release (C2). Requires status 'cleared'. Flips documents released.
CREATE OR REPLACE FUNCTION public.flowscrow_release(p_deal uuid)
RETURNS public.flowscrow_deals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_party uuid; v_deal public.flowscrow_deals;
BEGIN
  v_party := public.flowscrow_my_party(p_deal, 'counsel');
  IF v_party IS NULL THEN RAISE EXCEPTION 'counsel only'; END IF;
  SELECT * INTO v_deal FROM public.flowscrow_deals WHERE id=p_deal;
  IF v_deal.status <> 'cleared' THEN RAISE EXCEPTION 'deal not cleared'; END IF;

  UPDATE public.flowscrow_documents
     SET released=true, released_at=now()
   WHERE deal_id=p_deal AND released=false;

  UPDATE public.flowscrow_deals
     SET status='released',
         effective_date = COALESCE(effective_date, current_date),
         updated_at=now()
   WHERE id=p_deal RETURNING * INTO v_deal;

  -- C2 closes; C1 (counsel verification) is implicit in the approval.
  UPDATE public.flowscrow_tasks SET status='confirmed', confirmed_by=v_party, confirmed_at=now()
   WHERE deal_id=p_deal AND code IN ('C1','C2') AND status<>'confirmed';

  PERFORM public.flowscrow__log(p_deal, v_party, 'released',
    jsonb_build_object('effective_date', v_deal.effective_date));
  RETURN v_deal;
END $$;

-- Initiator records the optional on-chain anchor (C3). Wallet signs client-side;
-- the server only stores tx_hash + package_hash. Nothing sensitive on-chain.
CREATE OR REPLACE FUNCTION public.flowscrow_record_anchor(
  p_deal uuid, p_tx_hash text, p_package_hash text, p_chain text DEFAULT 'base')
RETURNS public.flowscrow_anchors
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_party uuid; v_anchor public.flowscrow_anchors; v_status text;
BEGIN
  v_party := public.flowscrow_my_party(p_deal, 'initiator');
  IF v_party IS NULL THEN RAISE EXCEPTION 'initiator only'; END IF;
  SELECT status INTO v_status FROM public.flowscrow_deals WHERE id=p_deal;
  IF v_status NOT IN ('released','anchored') THEN RAISE EXCEPTION 'deal not released'; END IF;

  INSERT INTO public.flowscrow_anchors (deal_id, chain, tx_hash, package_hash, anchored_by)
  VALUES (p_deal, p_chain, p_tx_hash, p_package_hash, public.current_fbid())
  RETURNING * INTO v_anchor;

  UPDATE public.flowscrow_deals SET status='anchored', updated_at=now() WHERE id=p_deal;
  PERFORM public.flowscrow__log(p_deal, v_party, 'anchored',
    jsonb_build_object('tx_hash', p_tx_hash, 'package_hash', p_package_hash, 'chain', p_chain));
  RETURN v_anchor;
END $$;

-- Optional supplementary personal wallet signature bound to a party (SIWE verified
-- server-side first). Stores only the address.
CREATE OR REPLACE FUNCTION public.flowscrow_set_wallet(p_deal uuid, p_address text)
RETURNS public.flowscrow_parties
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p public.flowscrow_parties;
BEGIN
  UPDATE public.flowscrow_parties
     SET wallet_address = p_address
   WHERE deal_id=p_deal AND flowbond_user_id=auth.uid()
   RETURNING * INTO v_p;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'not a party to this deal'; END IF;
  PERFORM public.flowscrow__log(p_deal, v_p.id, 'wallet_bound',
    jsonb_build_object('address', p_address));
  RETURN v_p;
END $$;

GRANT EXECUTE ON FUNCTION
  public.flowscrow_claim_party(),
  public.flowscrow_open_transfers(uuid),
  public.flowscrow_submit_task(uuid),
  public.flowscrow_confirm_task(uuid),
  public.flowscrow_counsel_approve(uuid),
  public.flowscrow_release(uuid),
  public.flowscrow_record_anchor(uuid, text, text, text),
  public.flowscrow_set_wallet(uuid, text)
TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED — FlowBond Tech / Russell Herod separation (Exhibit 3 — Closing Tasks)
--    initiator = Ferrera · counterparty = Herod · counsel = escrow counsel.
--    ⚠️ counterparty/counsel emails are PLACEHOLDERS — update before go-live so the
--    right person claims each slot on first login (see README).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_deal uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.flowscrow_deals
             WHERE title = 'FlowBond Tech / Russell Herod — Separation & Closing') THEN
    RETURN;
  END IF;

  INSERT INTO public.flowscrow_deals (title, status)
  VALUES ('FlowBond Tech / Russell Herod — Separation & Closing', 'draft')
  RETURNING id INTO v_deal;

  INSERT INTO public.flowscrow_parties (deal_id, role, display_name, email) VALUES
    (v_deal, 'initiator',    'Steph Ferrera',  'cryptocoatl101@gmail.com'),
    (v_deal, 'counterparty', 'Russell Herod',  'russell.herod@PLACEHOLDER.flowbond.tech'),
    (v_deal, 'counsel',      'Escrow Counsel',  'counsel@PLACEHOLDER.flowbond.tech');

  INSERT INTO public.flowscrow_documents (deal_id, kind) VALUES
    (v_deal, 'agreement'),
    (v_deal, 'courtesy_letter');

  INSERT INTO public.flowscrow_tasks
    (deal_id, code, phase, sort_order, title, responsible_role, verifier_role,
     responsible_label, verifier_label, acceptance_criteria) VALUES
  (v_deal,'A1','A',1,'Execute Agreement','all','counsel','All','Counsel',
    'Every required signature captured and held in escrow.'),
  (v_deal,'A2','A',2,'Stock power','counterparty','counsel','Herod','Counsel',
    'Executed Exhibit 1 held in escrow.'),
  (v_deal,'A3','A',3,'Resignation','counterparty','counsel','Herod','Counsel',
    'Executed Exhibit 2 held in escrow.'),
  (v_deal,'A4','A',4,'Courtesy letter','initiator','counsel','Ferrera','Counsel',
    'Signed Exhibit 5 held in escrow, unreleased.'),
  (v_deal,'B1','B',5,'Domains','counterparty','initiator','Herod','Ferrera',
    'flowbond.tech, danz.now, flowb.me, pee.network under "stepbysteph," DNS editable, Herod removed as contact.'),
  (v_deal,'B2','B',6,'FlowBond Tech repos + credentials','counterparty','initiator','Herod','Ferrera',
    'Ferrera owns/accesses all repos & keys; Herod removed.'),
  (v_deal,'B3','B',7,'Communication accounts','counterparty','initiator','Herod','Ferrera',
    'Telegram/Base/Farcaster owner/admin + recovery to Ferrera; Herod removed.'),
  (v_deal,'B4','B',8,'Web3 keys','counterparty','initiator','Herod','Ferrera',
    'Delivered via secure channel off-platform; Ferrera confirms control in writing; store only a boolean.'),
  (v_deal,'B5','B',9,'Company crypto','counterparty','initiator','Herod','Ferrera',
    'Full balances moved to Ferrera wallet; match pre-verified amounts.'),
  (v_deal,'B6','B',10,'Mercury','counterparty','initiator','Herod','Ferrera',
    'Ferrera sole owner/admin; Herod + cards removed.'),
  (v_deal,'B7','B',11,'Stripe','counterparty','initiator','Herod','Ferrera',
    'Ferrera owner/representative; Herod removed (KYC complete).'),
  (v_deal,'B8','B',12,'Coinbase','counterparty','initiator','Herod','Ferrera',
    'Ferrera controls account/wallets; Herod removed.'),
  (v_deal,'B9','B',13,'Infrastructure','counterparty','initiator','Herod','Ferrera',
    'Supabase (canonical fgsrcxxccdjqyrpkitmk under Ferrera''s org), Vercel, Apple/Google/DNS/secrets transferred; Herod removed.'),
  (v_deal,'B10','B',14,'Social de-identification','counterparty','initiator','Herod','Ferrera',
    'Profiles no longer present Herod as operating the Company; Ferrera not named/referenced.'),
  (v_deal,'B11','B',15,'Company books','initiator','counsel','Ferrera/Company','Counsel',
    'Ferrera recorded sole shareholder/officer/director; stock power + resignation recorded.'),
  (v_deal,'C1','C',16,'Counsel verification','counsel','counsel','Counsel','Counsel',
    'All Phase B accepted; approval recorded.'),
  (v_deal,'C2','C',17,'Release','counsel','both','Counsel/Escrow','Both',
    'Exhibit 5 to Herod + executed Agreement to both; effective per its terms.'),
  (v_deal,'C3','C',18,'On-chain anchor (optional)','initiator','initiator','Ferrera','Ferrera',
    'Proof-of-existence hash recorded on Base.');

  PERFORM public.flowscrow__log(v_deal, NULL, 'deal_seeded',
    jsonb_build_object('source','Exhibit 3 — Closing Tasks Schedule'));
END $$;
