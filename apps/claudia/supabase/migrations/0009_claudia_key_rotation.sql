-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0009_claudia_key_rotation.sql · private-key rotation  (§0)
--
--  Lets a sovereign ROTATE their key material when a recovery phrase may have
--  leaked (screenshot, lost paper, shared device). The client, holding the OLD
--  master secret in memory, mints a NEW master secret + recovery phrase,
--  re-wraps every per-conversation DEK under the new KEK, re-seals the identity
--  private key, and commits all of it ATOMICALLY here. After this the old
--  phrase opens nothing — its sealed share is gone and the live key material is
--  fresh. Content/DEKs/room memberships are preserved (DEKs unchanged; only
--  their KEK-wrapping is replaced), so nothing needs re-encrypting.
--
--  §0 holds: the server still only ever sees ciphertext + key material it can't
--  use. The rotation is computed client-side; this RPC just swaps blobs.
--
--  Depends on 0001 (key_shares, wrapped_deks) + 0004 (identity_keys).
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
-- ════════════════════════════════════════════════════════════════════════

-- all of the caller's wrapped DEKs (so the client can re-wrap them under KEK')
create or replace function claudia_all_wrapped_deks()
returns table(id uuid, conversation_id uuid, wrapped_dek text)
language sql security definer set search_path = public as $$
  select id, conversation_id, encode(wrapped_dek,'base64')
  from claudia_wrapped_deks where user_id = auth.uid();
$$;

-- atomic re-key: replace factor seals, re-wrap DEKs, re-seal identity — all or
-- nothing. A half-applied rotation could lock the user out, so it MUST be one
-- transaction (this function is). Refuses to leave the user with zero seals.
create or replace function claudia_rotate_keys(
  p_shares jsonb, p_wrapped jsonb, p_identity jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare s jsonb; w jsonb;
begin
  if p_shares is null or jsonb_array_length(p_shares) < 1 then
    raise exception 'rotation-needs-at-least-one-seal';
  end if;

  -- 1. replace the factor-sealed master-secret shares
  delete from claudia_key_shares where user_id = auth.uid();
  for s in select * from jsonb_array_elements(p_shares) loop
    insert into claudia_key_shares(user_id, factor, sealed_share)
    values (auth.uid(), s->>'factor', decode(s->>'sealed_share','base64'));
  end loop;

  -- 2. re-wrap every per-conversation DEK under the new KEK (same DEK, new wrap)
  if p_wrapped is not null then
    for w in select * from jsonb_array_elements(p_wrapped) loop
      update claudia_wrapped_deks
         set wrapped_dek = decode(w->>'wrapped_dek','base64')
       where user_id = auth.uid() and conversation_id = (w->>'conversation_id')::uuid;
    end loop;
  end if;

  -- 3. re-seal the group-ZK identity private key under the new KEK (keypair kept,
  --    so room memberships stay valid — only its at-rest sealing changes)
  if p_identity is not null then
    update claudia_identity_keys
       set sealed_private = decode(p_identity->>'sealed_private','base64'),
           sealed_nonce   = decode(p_identity->>'sealed_nonce','base64')
     where user_id = auth.uid();
  end if;
end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_all_wrapped_deks()',
    'claudia_rotate_keys(jsonb,jsonb,jsonb)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
