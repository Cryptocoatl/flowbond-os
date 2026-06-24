import type { DealStatus, PartyRole, TaskStatus } from './types';

export const ROLE_LABEL: Record<PartyRole, string> = {
  initiator: 'Ferrera (initiator)',
  counterparty: 'Herod (counterparty)',
  counsel: 'Counsel',
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  draft: 'Draft — awaiting execution',
  signed_pending_transfers: 'Signed — transfers in progress',
  cleared: 'Cleared — ready to release',
  released: 'Released',
  anchored: 'Released & anchored on Base',
};

export function taskStatusColor(s: TaskStatus): string {
  return s === 'confirmed' ? '#8FA98F' : s === 'submitted' ? '#C9A961' : '#7c8a82';
}

/** Can the caller submit this task right now? */
export function canSubmit(
  status: TaskStatus,
  responsibleRole: PartyRole | 'all',
  myRoles: PartyRole[],
): boolean {
  if (status !== 'pending') return false;
  if (responsibleRole === 'all') return myRoles.length > 0;
  return myRoles.includes(responsibleRole);
}

/** Can the caller confirm this task right now? */
export function canConfirm(
  status: TaskStatus,
  verifierRole: PartyRole | 'both',
  myRoles: PartyRole[],
): boolean {
  if (status !== 'submitted') return false;
  if (verifierRole === 'both') {
    return myRoles.includes('initiator') || myRoles.includes('counterparty');
  }
  return myRoles.includes(verifierRole);
}
