// Visual metadata for domain enums — colors/labels/icons in one place so tiles,
// bars, chips and legends never drift. Colors mirror tailwind kai.* tokens.
import type { IconName } from '@/components/kai/Icon';
import type { MissionCategory } from './types';

export const CATEGORY_META: Record<
  MissionCategory,
  { label: string; color: string; icon: IconName }
> = {
  restore: { label: 'Restore', color: '#6FCF97', icon: 'tree' },
  learn: { label: 'Learn', color: '#7CC7FF', icon: 'library' },
  build: { label: 'Build', color: '#F4C25A', icon: 'cube' },
  connect: { label: 'Connect', color: '#B69CFF', icon: 'people' },
  celebrate: { label: 'Celebrate', color: '#F4A65A', icon: 'spark' },
};

export const CHANNEL_META: {
  key: 'canopy' | 'water' | 'biodiversity' | 'communityPulse';
  label: string;
  color: string;
  icon: IconName;
}[] = [
  { key: 'canopy', label: 'Canopy', color: '#6FCF97', icon: 'leaf' },
  { key: 'water', label: 'Water', color: '#7CC7FF', icon: 'water' },
  { key: 'biodiversity', label: 'Biodiversity', color: '#B69CFF', icon: 'bird' },
  { key: 'communityPulse', label: 'Community', color: '#F4C25A', icon: 'people' },
];

export const POINT_COLOR: Record<string, string> = {
  flow: '#7BE0B0',
  impact: '#B69CFF',
  creation: '#F4C25A',
  wisdom: '#7CC7FF',
  token: '#F4A65A',
};
