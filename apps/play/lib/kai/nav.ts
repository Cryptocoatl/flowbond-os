// Primary navigation — one source for the desktop rail and the mobile bottom bar.
import type { IconName } from '@/components/kai/Icon';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
}

export const NAV: NavItem[] = [
  { key: 'explore', label: 'Explore', icon: 'explore', href: '/' },
  { key: 'map', label: 'Map', icon: 'map', href: '/r/valle-espejo' },
  { key: 'missions', label: 'Missions', icon: 'missions', href: '/#missions' },
  { key: 'communities', label: 'Communities', icon: 'communities', href: '/#communities' },
  { key: 'events', label: 'Events', icon: 'events', href: '/#events' },
  { key: 'marketplace', label: 'Marketplace', icon: 'marketplace', href: '/#marketplace' },
  { key: 'library', label: 'Library', icon: 'library', href: '/#library' },
  { key: 'profile', label: 'Profile', icon: 'profile', href: '/#profile' },
];

/** Bottom bar shows a focused subset on small screens. */
export const MOBILE_NAV_KEYS = ['explore', 'map', 'missions', 'communities', 'profile'];
