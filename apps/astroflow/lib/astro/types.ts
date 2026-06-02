import type { Sign } from './ephemeris';

export type Visibility = 'private' | 'friends' | 'specific' | 'public';

export interface BirthData {
  date: string;       // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' (local); null = unknown -> no houses/angles
  tz: string;         // IANA tz, e.g. 'America/Mexico_City'
  lat: number;        // degrees, north positive
  lng: number;        // degrees, EAST positive
  place: string;      // human label
}

export interface Body {
  abs: number;   // absolute ecliptic longitude 0–360
  sign: Sign;
  deg: number;   // degrees within sign
  house: number; // 1–12 (whole-sign); 0 if no birth time
  retro: boolean;
}

export interface Chart {
  jd: number;
  hasTime: boolean;
  bodies: Record<string, Body>;          // Sun, Moon, Mercury … Pluto
  asc: { abs: number; sign: Sign; deg: number } | null;
  mc: { abs: number; sign: Sign; deg: number } | null;
  node: { abs: number; sign: Sign; deg: number };
  elements: Record<'Fire' | 'Earth' | 'Air' | 'Water', number>;
  modalities: Record<'Cardinal' | 'Fixed' | 'Mutable', number>;
}

export interface Aspect {
  p1: string;
  p2: string;
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx';
  glyph: string;
  orb: number;
  tight: number;   // 0–1, exactness
  harmony: number; // -1 … +1
}

export interface SynastryResult {
  score: number;            // 0–100 for the given context
  context: RelContext;
  aspects: (Aspect & { weight: number; contrib: number })[];
}

export type RelContext = 'friendship' | 'romance' | 'coliving' | 'business';

export interface AstroProfile {
  fbid: string;
  handle: string;          // FlowBond handle, used as @mention
  displayName: string;
  birth: BirthData;
  chart: Chart;
  visibility: Visibility;
  avatarColor: string;
}

export interface AcgLine {
  planet: string;
  kind: 'MC' | 'IC' | 'AC' | 'DC';
  // MC/IC are meridians (single lng, all lats); AC/DC are curves
  lng?: number;
  curve?: { lat: number; lng: number }[];
}

export interface EcosystemPlace {
  id: string;
  name: string;
  kind: 'property' | 'retreat' | 'event' | 'community';
  lat: number;
  lng: number;
}
