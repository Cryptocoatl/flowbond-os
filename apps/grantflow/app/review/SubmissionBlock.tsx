'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmissionItem } from '@/lib/types';
import { ReviewCardData } from './load';

const METHOD_LABEL: Record<string, string> = {
  portal: 'Funder portal',
  email: 'Email',
  form: 'Web form',
  mail: 'Postal mail',
  onchain: 'On-chain',
};

function Checklist({
  applicationId,
  items,
  locked,
}: {
  applicationId: string;
  items: SubmissionItem[];
  locked: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function toggle(item: SubmissionItem) {
    setBusy(true);
    await fetch(`/api/applications/${applicationId}/checklist`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, done: !item.done }),
    });
    router.refresh();
    setBusy(false);
  }

  async function add() {
    if (!label.trim()) return;
    setBusy(true);
    await fetch(`/api/applications/${applicationId}/checklist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), position: items.length }),
    });
    setLabel('');
    router.refresh();
    setBusy(false);
  }

  async function remove(item: SubmissionItem) {
    setBusy(true);
    await fetch(`/api/applications/${applicationId}/checklist?item_id=${item.id}`, {
      method: 'DELETE',
    });
    router.refresh();
    setBusy(false);
  }

  const missing = items.filter((i) => i.required && !i.done).length;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        Attachments
        {missing > 0 && (
          <span style={{ color: '#fca5a5', fontWeight: 400, marginLeft: 6 }}>
            {missing} required item{missing > 1 ? 's' : ''} outstanding
          </span>
        )}
      </div>
      {items.length === 0 && (
        <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>
          Nothing listed yet — add what this funder asks for.
        </div>
      )}
      {items.map((i) => (
        <label
          key={i.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            padding: '3px 0',
            cursor: locked ? 'default' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={i.done}
            disabled={busy || locked}
            onChange={() => toggle(i)}
            style={{ accentColor: 'var(--gf-emerald)' }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: i.done ? 'line-through' : undefined,
              color: i.done ? 'var(--gf-muted)' : undefined,
            }}
          >
            {i.label}
            {i.required && !i.done && <span style={{ color: '#fca5a5' }}> *</span>}
          </span>
          {i.checked_by && (
            <span style={{ color: 'var(--gf-muted)', fontSize: 11 }}>{i.checked_by}</span>
          )}
          {!locked && (
            <button
              onClick={(e) => {
                e.preventDefault();
                remove(i);
              }}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--gf-muted)',
                cursor: 'pointer',
                fontSize: 13,
              }}
              title="Remove"
            >
              ×
            </button>
          )}
        </label>
      ))}
      {!locked && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            className="gf-input"
            value={label}
            placeholder="Add an attachment the funder requires…"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="gf-btn" onClick={add} disabled={busy || !label.trim()} style={{ fontSize: 12 }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function SubmissionBlock({
  card,
  ready,
}: {
  card: ReviewCardData;
  ready: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [method, setMethod] = useState(card.submissionMethod ?? 'portal');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submitted = card.reviewState === 'submitted';
  const link = card.submissionUrl ?? card.grantUrl;

  async function markSubmitted() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/applications/${card.id}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: true, method, ref: ref.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setConfirming(false);
      setTyped('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    await fetch(`/api/applications/${card.id}/submit`, { method: 'DELETE' });
    router.refresh();
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>Submission</div>

      <div style={{ fontSize: 12, color: 'var(--gf-muted)', marginTop: 4, lineHeight: 1.6 }}>
        <div>
          Method: <span style={{ color: 'var(--gf-text)' }}>
            {METHOD_LABEL[card.submissionMethod ?? ''] ?? card.submissionMethod ?? 'not recorded'}
          </span>
        </div>
        {card.submissionEmail && (
          <div>
            Send to: <span style={{ color: 'var(--gf-text)' }}>{card.submissionEmail}</span>
          </div>
        )}
        {link && (
          <div>
            Where:{' '}
            <a className="link" href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
          </div>
        )}
      </div>

      <Checklist applicationId={card.id} items={card.items} locked={submitted} />

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--gf-border)',
        }}
      >
        {submitted ? (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ color: 'var(--cl-gold)', fontWeight: 600 }}>
              Submitted by {card.submittedBy}
            </div>
            <div style={{ color: 'var(--gf-muted)' }}>
              {card.submittedAt ? new Date(card.submittedAt).toLocaleString() : ''}
              {card.submissionRef ? ` · ref ${card.submissionRef}` : ''}
            </div>
            <button
              className="gf-btn"
              onClick={undo}
              disabled={busy}
              style={{ fontSize: 11, marginTop: 8, background: 'transparent' }}
            >
              Undo — I marked this by mistake
            </button>
          </div>
        ) : !confirming ? (
          <>
            <button
              className="gf-btn"
              onClick={() => setConfirming(true)}
              disabled={!ready}
              title={
                ready
                  ? 'Records a submission you already made'
                  : 'All audit rounds must pass before this unlocks'
              }
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            >
              Mark as submitted
            </button>
            <div
              style={{
                color: 'var(--gf-muted)',
                fontSize: 11,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              ClaudIA never sends anything to a funder. You submit on their portal; this only
              writes down that you did.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: 'var(--gf-gold)', fontWeight: 600, marginBottom: 6 }}>
              Confirm you have already submitted this to {card.organization ?? 'the funder'}.
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select
                className="gf-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ fontSize: 12, flex: 1 }}
              >
                {Object.entries(METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                className="gf-input"
                value={ref}
                placeholder="Confirmation # (optional)"
                onChange={(e) => setRef(e.target.value)}
                style={{ fontSize: 12, flex: 1 }}
              />
            </div>
            <input
              className="gf-input"
              value={typed}
              placeholder="Type SUBMITTED to confirm"
              onChange={(e) => setTyped(e.target.value)}
              style={{ fontSize: 12, width: '100%' }}
            />
            {err && <div style={{ color: '#fca5a5', marginTop: 6 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                className="gf-btn"
                onClick={markSubmitted}
                disabled={busy || typed.trim().toUpperCase() !== 'SUBMITTED'}
                style={{ fontSize: 12, flex: 1, justifyContent: 'center' }}
              >
                {busy ? 'Recording…' : 'Yes — I submitted it'}
              </button>
              <button
                className="gf-btn"
                onClick={() => {
                  setConfirming(false);
                  setTyped('');
                  setErr(null);
                }}
                disabled={busy}
                style={{ fontSize: 12, background: 'transparent' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
