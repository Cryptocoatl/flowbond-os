'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RELATIONSHIPS } from '@/lib/types';

export default function AddContact() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: '', organization: '', email: '', role: '', relationship: 'funder', notes: '',
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: f.name.trim(),
          organization: f.organization || null,
          email: f.email || null,
          role: f.role || null,
          relationship: f.relationship || null,
          notes: f.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setF({ name: '', organization: '', email: '', role: '', relationship: 'funder', notes: '' });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  }

  if (!open) {
    return <button className="cl-btn" onClick={() => setOpen(true)}>✦ Add contact</button>;
  }

  return (
    <div className="gf-card" style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
      <div style={{ fontWeight: 600 }}>New contact</div>
      <input className="gf-input" placeholder="Name *" value={f.name} onChange={set('name')} />
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="gf-input" style={{ flex: 1 }} placeholder="Organization" value={f.organization} onChange={set('organization')} />
        <select className="gf-select" value={f.relationship} onChange={set('relationship')}>
          {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="gf-input" style={{ flex: 1 }} placeholder="Email" value={f.email} onChange={set('email')} />
        <input className="gf-input" style={{ flex: 1 }} placeholder="Role / title" value={f.role} onChange={set('role')} />
      </div>
      <textarea className="gf-input" placeholder="Notes" rows={2} value={f.notes} onChange={set('notes')} />
      {err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="cl-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</button>
        <button className="gf-btn" style={{ background: 'transparent' }} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
