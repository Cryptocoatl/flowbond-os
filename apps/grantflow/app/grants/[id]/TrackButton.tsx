'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STAGES } from '@/lib/types';

export default function TrackButton({
  grantId,
  grantName,
  projects,
}: {
  grantId: string;
  grantName: string;
  projects: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(projects[0]?.slug ?? '');
  const [stage, setStage] = useState<string>('researching');
  const [owner, setOwner] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grant_id: grantId, project_slug: project || null, stage, owner: owner || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setDone(true);
      setTimeout(() => router.push('/pipeline'), 700);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="gf-card" style={{ textAlign: 'center', color: 'var(--gf-emerald)' }}>
        ✓ Added to pipeline — opening…
      </div>
    );
  }

  return (
    <div className="gf-card">
      {!open ? (
        <button className="gf-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOpen(true)}>
          + Track this grant
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Add “{grantName}” to pipeline</div>
          <label style={{ fontSize: 12, color: 'var(--gf-muted)' }}>
            Project
            <select className="gf-select" value={project} onChange={(e) => setProject(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              <option value="">— none —</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--gf-muted)' }}>
            Stage
            <select className="gf-select" value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--gf-muted)' }}>
            Owner (optional)
            <input className="gf-input" value={owner} onChange={(e) => setOwner(e.target.value)} style={{ width: '100%', marginTop: 4 }} placeholder="who drives this" />
          </label>
          {err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="gf-btn" onClick={save} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="gf-btn" onClick={() => setOpen(false)} style={{ background: 'transparent' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
