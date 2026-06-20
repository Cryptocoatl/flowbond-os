import type { Locale } from './config';
import { common } from './frag/common';
import { group1 } from './frag/group1';
import { group2 } from './frag/group2';
import { group3 } from './frag/group3';
import { group4 } from './frag/group4';
import { currents } from './frag/currents';
import { privacy } from './frag/privacy';

// One Spanish map, assembled from per-area fragments so they can be authored
// independently without merge collisions. Keys are the English SOURCE strings;
// values are the Spanish translation. Missing keys fall back to English.
export const es: Record<string, string> = {
  ...common,
  ...group1,
  ...group2,
  ...group3,
  ...group4,
  ...currents,
  ...privacy,
};

export const DICT: Record<Exclude<Locale, 'en'>, Record<string, string>> = {
  es,
};
