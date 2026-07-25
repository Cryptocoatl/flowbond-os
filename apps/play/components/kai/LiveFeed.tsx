'use client';
// LiveWorldFeed — realtime stream of validated actions. Subscribes to inserts on
// kai_pulse_events (each row = a node-leader-validated proof that healed a region).
// Empty until the first action flows; then it streams live with no refresh.
import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/supabase';
import { Panel } from './Panel';
import { EmptyState } from './EmptyState';

interface Live {
  id: string;
  weight: number;
  at: string;
}

export function LiveFeed({ regionName = 'the world' }: { regionName?: string }) {
  const [items, setItems] = useState<Live[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let sb;
    try {
      sb = browserSupabase();
    } catch {
      return;
    }
    const channel = sb
      .channel('kai_pulse_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kai_pulse_events' }, (payload) => {
        const r = payload.new as { proof_id: string; weight: number; validated_at: string };
        setItems((prev) => [{ id: r.proof_id, weight: r.weight, at: r.validated_at }, ...prev].slice(0, 8));
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return (
    <Panel
      eyebrow="Live"
      title="World feed"
      action={
        <span className="chip">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-breathe bg-kai-jade' : 'bg-kai-faint'}`} />
          realtime
        </span>
      }
    >
      {items.length === 0 ? (
        <EmptyState icon="spark" title="The world is quiet" hint="Validated actions appear here the moment a node leader confirms them." />
      ) : (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.id} className="flex animate-fade-up items-start gap-2 text-[13px]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kai-jade" />
              <span className="text-kai-muted">
                A verified action healed <span className="text-kai-text">{regionName}</span>
                <span className="text-kai-faint"> · +{Math.round(f.weight * 100)} pulse</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
