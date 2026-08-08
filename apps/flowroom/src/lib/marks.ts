import type { MarkKey } from '@/content/types';

/**
 * The five marks.
 *
 * Deliberately in their own module with no data-layer import. These are
 * needed by every annotated block, and when they lived in `room.ts` they
 * dragged the whole Supabase client into the shipped bundle — which then
 * throws at boot if the environment has no keys. Constants should not be
 * able to take a database down with them.
 */
export const MARK_LABELS: Record<MarkKey, string> = {
  agreed: 'Agreed',
  question: 'Question',
  already_have: 'We have this',
  different_timeline: 'Different timing',
  not_this: 'Not this',
};

export const MARK_ORDER: MarkKey[] = [
  'agreed',
  'question',
  'already_have',
  'different_timeline',
  'not_this',
];

/** The deck's own five, used as functional signal rather than decoration. */
export const MARK_COLORS: Record<MarkKey, string> = {
  agreed: '#F0C46A',
  question: '#4FA8FF',
  already_have: '#52E3C2',
  different_timeline: '#FFD84F',
  not_this: '#FF4FCF',
};
