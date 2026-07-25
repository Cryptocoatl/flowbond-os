// =============================================================================
// World constants extracted from the reference comps: the Guardian roster and
// the economy currencies. Static config today; each has an image/data seam so
// it can move to the DB (kai_guardians / kai_point_ledger) without touching UI.
// =============================================================================
import type { Guardian, PointBalance } from './types';

export const GUARDIANS: Guardian[] = [
  { slug: 'tef', name: 'Tef', role: 'Guide of Flow', focus: ['Connection', 'Motivation'], accent: 'flow', portrait: '/images/guardians/tef.webp' },
  { slug: 'claudia', name: 'Claudia', role: 'Engineer of Systems', focus: ['Technology', 'Solutions'], accent: 'wisdom', portrait: '/images/guardians/claudia.webp' },
  { slug: 'sofia', name: 'Sofia', role: 'Keeper of Wisdom', focus: ['History', 'Culture'], accent: 'wisdom', portrait: '/images/guardians/sofia.webp' },
  { slug: 'naturalia', name: 'Naturalia', role: 'Voice of Nature', focus: ['Ecology', 'Biodiversity'], accent: 'jade', portrait: '/images/guardians/naturalia.webp' },
  { slug: 'historia', name: 'Historia', role: 'Seer of Time', focus: ['Past', 'Legacy'], accent: 'token', portrait: '/images/guardians/historia.webp' },
  { slug: 'ingenia', name: 'Ingenia', role: 'Maker of Things', focus: ['Robotics', 'IoT'], accent: 'creation', portrait: '/images/guardians/ingenia.webp' },
  { slug: 'artia', name: 'Artia', role: 'Muse of Art', focus: ['Art', 'Expression'], accent: 'impact', portrait: '/images/guardians/artia.webp' },
  { slug: 'econia', name: 'Econia', role: 'Weaver of Value', focus: ['Economy', 'DAOs'], accent: 'token', portrait: '/images/guardians/econia.webp' },
];

/** The active guide shown in the Guardian widget (rotates later by context/AI). */
export const PRIMARY_GUARDIAN = GUARDIANS[0];

/**
 * Economy currencies. value:null renders as "—" until a real ledger is wired
 * (kai_point_ledger). No fake numbers — honest empty state.
 */
export const POINTS: PointBalance[] = [
  { key: 'flow', label: 'Flow', value: null },
  { key: 'impact', label: 'Impact', value: null },
  { key: 'creation', label: 'Creation', value: null },
  { key: 'wisdom', label: 'Wisdom', value: null },
  { key: 'token', label: 'Kai Tokens', value: null },
];
