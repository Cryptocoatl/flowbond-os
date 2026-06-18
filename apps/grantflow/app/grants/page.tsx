import { dbRead } from '@/lib/supabase-server';
import { Grant } from '@/lib/types';
import GrantsExplorer, { GrantRow } from './GrantsExplorer';

export const dynamic = 'force-dynamic';

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const db = dbRead();
  const [{ data: grantsRaw }, { data: matches }] = await Promise.all([
    db.from('grants').select('*'),
    db.from('matches').select('grant_id'),
  ]);
  const grants = (grantsRaw ?? []) as Grant[];

  const counts = new Map<string, number>();
  for (const m of matches ?? []) {
    counts.set(m.grant_id, (counts.get(m.grant_id) ?? 0) + 1);
  }
  const rows: GrantRow[] = grants.map((g) => ({ ...g, matchCount: counts.get(g.id) ?? 0 }));

  return <GrantsExplorer rows={rows} initialLayer={sp.layer} initialStatus={sp.status} />;
}
