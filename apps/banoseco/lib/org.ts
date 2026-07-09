// Typed wrappers over the org/admin SECURITY DEFINER RPCs (migration 02).
// Browser client → RLS + auth.uid(); every privileged check lives in the RPC.
import { browserClient } from './supabase/client';
import type {
  MissionStatus,
  MissionKind,
  MyOrg,
  NodeKind,
  OrgKind,
  OrgMember,
  OrgNode,
  OrgRole,
  ToiletStatus,
} from './types';

const sb = () => browserClient();

/** slugify a name into a url-safe org slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export async function myOrgs(): Promise<MyOrg[]> {
  const { data, error } = await sb().rpc('banoseco_my_orgs');
  if (error) throw error;
  return (data ?? []) as MyOrg[];
}

export async function createOrg(input: {
  name: string;
  kind: OrgKind;
  slug?: string;
  description?: string;
  contactEmail?: string;
}): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_create_org', {
    in_name: input.name,
    in_kind: input.kind,
    in_slug: input.slug ?? slugify(input.name),
    in_description: input.description ?? null,
    in_contact_email: input.contactEmail ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function orgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await sb().rpc('banoseco_org_members_list', { in_org_id: orgId });
  if (error) throw error;
  return (data ?? []) as OrgMember[];
}

export async function addOrgMember(
  orgId: string,
  email: string,
  role: OrgRole = 'steward',
): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_add_org_member_by_email', {
    in_org_id: orgId,
    in_email: email,
    in_role: role,
  });
  if (error) throw error;
  return data as string;
}

export async function createNode(input: {
  orgId: string;
  code: string;
  name: string;
  nodeKind: NodeKind;
  lat: number;
  lng: number;
  neighborhood?: string;
  hasSolarCharge?: boolean;
  hasRecycling?: boolean;
  donationUrl?: string;
  capacityUses?: number;
}): Promise<string> {
  const { data, error } = await sb().rpc('banoseco_create_node', {
    in_org_id: input.orgId,
    in_code: input.code,
    in_name: input.name,
    in_node_kind: input.nodeKind,
    in_lat: input.lat,
    in_lng: input.lng,
    in_neighborhood: input.neighborhood ?? null,
    in_has_solar_charge: input.hasSolarCharge ?? false,
    in_has_recycling: input.hasRecycling ?? false,
    in_donation_url: input.donationUrl ?? null,
    in_capacity_uses: input.capacityUses ?? 60,
  });
  if (error) throw error;
  return data as string;
}

export async function setNodeStatus(nodeId: string, status: ToiletStatus): Promise<boolean> {
  const { data, error } = await sb().rpc('banoseco_set_node_status', {
    in_node_id: nodeId,
    in_status: status,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function verifyMission(missionId: string): Promise<boolean> {
  const { data, error } = await sb().rpc('banoseco_verify_mission', { in_mission_id: missionId });
  if (error) throw error;
  return Boolean(data);
}

/** Nodes owned by an org (banoseco_toilets is public-readable; filter by org). */
export async function orgNodes(orgId: string): Promise<OrgNode[]> {
  const { data, error } = await sb()
    .from('banoseco_toilets')
    .select(
      'id,code,name,neighborhood,lat,lng,status,fill_pct,node_kind,has_solar_charge,has_recycling,donation_url,active',
    )
    .eq('org_id', orgId)
    .order('code', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrgNode[];
}

/** Missions on an org's nodes (for the verify queue). */
export async function orgMissions(
  orgId: string,
  statuses: MissionStatus[] = ['done', 'claimed', 'open'],
): Promise<
  Array<{
    id: string;
    kind: MissionKind;
    status: MissionStatus;
    proof_url: string | null;
    completed_at: string | null;
    toilet: { code: string; name: string } | null;
  }>
> {
  const { data, error } = await sb()
    .from('banoseco_missions')
    .select(
      'id,kind,status,proof_url,completed_at,toilet:banoseco_toilets!inner(code,name,org_id)',
    )
    .eq('toilet.org_id', orgId)
    .in('status', statuses)
    .order('completed_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((m) => {
    const r = m as unknown as {
      id: string;
      kind: MissionKind;
      status: MissionStatus;
      proof_url: string | null;
      completed_at: string | null;
      toilet: { code: string; name: string } | { code: string; name: string }[] | null;
    };
    return { ...r, toilet: Array.isArray(r.toilet) ? r.toilet[0] ?? null : r.toilet };
  });
}
