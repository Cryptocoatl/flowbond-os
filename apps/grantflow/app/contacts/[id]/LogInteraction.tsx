'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INTERACTION_KINDS } from '@/lib/types';

const LOGGABLE = INTERACTION_KINDS.filter((k) => k !== 'ai_draft' && k !== 'model');

export default function LogInteraction({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>('email');
  const [direction, setDirection] = useState('out');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!summary.trim()) { setErr('Add a short summary'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind, direction, summary: summary.trim(), body: body || null,
          actor: 'Steph', contact_id: contactId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setSummary(''); setBody('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="gf-card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Log a touch</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <select className="gf-select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {LOGGABLE.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="gf-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="out">outgoing</option>
          <option value="in">incoming</option>
          <option value="internal">internal</option>
        </select>
      </div>
      <input className="gf-input" placeholder="Summary (e.g. Intro email sent)" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <textarea className="gf-input" placeholder="Details (optional)" rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      {err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
      <button className="cl-btn" onClick={save} disabled={saving} style={{ justifySelf: 'start' }}>
        {saving ? 'Logging…' : '✦ Log it'}
      </button>
    </div>
  );
}
