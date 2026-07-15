-- ============================================================================
-- TulumCoin · rate-card split — PetgasCoin legacy vs current
--
-- Two Petgas contracts carry different meaning:
--   PETGAS_OG    <- 0x28cfa181… (deprecated "Old Contract") = EARLINESS evidence
--   PETGAS_ALLY  <- 0x46617e…   (current token)            = present alignment
--
-- The legacy contract must never be presented as the current Petgas token; it
-- is snapshotted purely as proof of having been early. Idempotent upsert so it
-- is safe whether or not the base migration already seeded these rows.
-- ⚠️ NOT YET APPLIED — authored for review.
-- ============================================================================
insert into public.tulum_xp_rate_card (credential, base_xp, requires_validator, multiplier_applies) values
  ('PETGAS_OG',   200, false, false),
  ('PETGAS_ALLY', 100, false, false)
on conflict (credential) do update
  set base_xp            = excluded.base_xp,
      requires_validator = excluded.requires_validator,
      multiplier_applies = excluded.multiplier_applies;
