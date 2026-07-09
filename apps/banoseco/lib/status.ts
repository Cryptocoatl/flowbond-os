import type { ToiletStatus } from './types';

export type StatusVisual = 'ok' | 'full' | 'serv';

/** Collapse the 5 DB statuses into the 3 visual buckets the prototype uses. */
export function statusVisual(s: ToiletStatus): StatusVisual {
  if (s === 'full') return 'full';
  if (s === 'servicing') return 'serv';
  return 'ok'; // ok | filling | offline(excluded upstream)
}

export const STATUS_COLOR: Record<StatusVisual, string> = {
  ok: 'var(--bs-gold)',
  full: 'var(--bs-clay)',
  serv: 'var(--bs-jade)',
};

export const STATUS_LABEL: Record<StatusVisual, { cls: string; text: string }> = {
  ok: { cls: 'st-ok', text: 'Activo' },
  full: { cls: 'st-full', text: 'Misión abierta' },
  serv: { cls: 'st-serv', text: 'En servicio' },
};
