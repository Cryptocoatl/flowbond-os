import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  normalizeNdvi,
  normalizeObservations,
  decayPulse,
  computeRegionState,
} from './index';
import { DEFAULT_WEIGHTS } from './types';
import { applyBloomDelta } from './delta';

test('clamp01 bounds', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(0.5), 0.5);
});

test('normalizeNdvi maps bare→lush across 0.2..0.8', () => {
  assert.equal(normalizeNdvi(0.2), 0);
  assert.equal(normalizeNdvi(0.8), 1);
  assert.ok(normalizeNdvi(0.5) > 0 && normalizeNdvi(0.5) < 1);
});

test('observations are log-scaled and saturate at cap', () => {
  assert.equal(normalizeObservations(0, 500), 0);
  assert.equal(normalizeObservations(500, 500), 1);
  // early sightings move faster than late ones
  assert.ok(normalizeObservations(50, 500) > 0.5 * normalizeObservations(500, 500) * 0.5);
});

test('pulse decays with half-life', () => {
  const now = 1_000_000_000_000;
  const halfLife = 14;
  const dayMs = 86_400_000;
  const fresh = decayPulse([{ validatedAt: now, weight: 1 }], halfLife, now);
  const aged = decayPulse(
    [{ validatedAt: now - 14 * dayMs, weight: 1 }],
    halfLife,
    now,
  );
  assert.ok(Math.abs(fresh - 1) < 1e-9);
  assert.ok(Math.abs(aged - 0.5) < 1e-6);
});

test('computeRegionState produces a bounded, sane state', () => {
  const s = computeRegionState(
    { ndvi: 0.6, ndwi: 0.2, observations: 120, sampledAt: Date.now() },
    [{ validatedAt: Date.now(), weight: 0.3 }],
  );
  for (const v of Object.values(s)) assert.ok(v >= 0 && v <= 1);
  assert.ok(s.vitality > 0);
});

test('applyBloomDelta lifts pulse and vitality, stays bounded', () => {
  const before = computeRegionState(
    { ndvi: 0.4, ndwi: 0.0, observations: 10, sampledAt: 0 },
    [],
    DEFAULT_WEIGHTS,
    0,
  );
  const after = applyBloomDelta(before);
  assert.ok(after.communityPulse > before.communityPulse);
  assert.ok(after.vitality >= before.vitality);
  assert.ok(after.vitality <= 1);
});
