'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuditFinding, DraftSection } from '@/lib/types';
import { wordCount } from '@/lib/review';
import { SEVERITY_COLOR } from '@/app/components/review-ui';

/** Findings from the freshest verdict of each round, keyed by the section they hit. */
export type FindingsBySection = Map<string, (AuditFinding & { round: string })[]>;

function Finding({ f }: { f: AuditFinding & { round: string } }) {
  const color = SEVERITY_COLOR[f.severity] ?? SEVERITY_COLOR.note;
  return (
    <div
      style={{
        borderLeft: `2px solid ${color}`,
        paddingLeft: 9,
        marginTop: 8,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <div style={{ color, fontWeight: 600, fontSize: 11, letterSpacing: '0.03em' }}>
        {f.severity.toUpperCase()} · {f.round}
        {f.traceability ? ` · ${f.traceability}` : ''}
      </div>
      {f.claim && (
        <div style={{ color: 'var(--gf-muted)', fontStyle: 'italic', marginTop: 2 }}>“{f.claim}”</div>
      )}
      <div style={{ marginTop: 2 }}>{f.issue}</div>
      {f.suggestion && (
        <div style={{ color: 'var(--gf-muted)', marginTop: 2 }}>→ {f.suggestion}</div>
      )}
      {f.source && (
        <div style={{ color: 'var(--gf-muted)', marginTop: 2, fontSize: 11 }}>source: {f.source}</div>
      )}
    </div>
  );
}

function SectionRow({
  applicationId,
  section,
  findings,
  disabled,
}: {
  applicationId: string;
  section: DraftSection;
  findings: (AuditFinding & { round: string })[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(section.body);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const wc = wordCount(body);
  const over = section.word_limit != null && wc > section.word_limit;
  const dirty = body !== section.body;
  const blockers = findings.filter((f) => f.severity === 'blocker').length;

  async function save() {
    if (!dirty) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/sections`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: section.key, body }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--gf-border)', padding: '9px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'transparent',
          border: 0,
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--gf-muted)', fontSize: 11, width: 10 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
          {section.label}
          {section.required && !body.trim() && (
            <span style={{ color: '#fca5a5', marginLeft: 6, fontSize: 11 }}>empty</span>
          )}
        </span>
        {blockers > 0 && (
          <span style={{ color: SEVERITY_COLOR.blocker, fontSize: 11 }}>
            {blockers} blocker{blockers > 1 ? 's' : ''}
          </span>
        )}
        <span style={{ color: over ? '#fca5a5' : 'var(--gf-muted)', fontSize: 11 }}>
          {wc}
          {section.word_limit ? `/${section.word_limit}` : ''} w
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 8, paddingLeft: 18 }}>
          <textarea
            className="gf-input"
            value={body}
            disabled={disabled || saving}
            onChange={(e) => setBody(e.target.value)}
            onBlur={save}
            rows={Math.min(18, Math.max(4, Math.ceil(body.length / 90) + 1))}
            style={{
              width: '100%',
              resize: 'vertical',
              lineHeight: 1.55,
              fontFamily: 'inherit',
              fontSize: 13,
              borderColor: over ? 'rgba(248,113,113,0.45)' : undefined,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 5,
              fontSize: 11,
              color: 'var(--gf-muted)',
            }}
          >
            {disabled ? (
              <span>Submitted — locked</span>
            ) : saving ? (
              <span>Saving…</span>
            ) : dirty ? (
              <span style={{ color: 'var(--gf-gold)' }}>Unsaved — click away to save</span>
            ) : (
              <span>
                Saved {new Date(section.updated_at).toLocaleString()}
                {section.updated_by ? ` · ${section.updated_by}` : ''}
              </span>
            )}
            {over && <span style={{ color: '#fca5a5' }}>Over the funder&apos;s word limit</span>}
          </div>
          {err && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>{err}</div>}
          {findings.map((f, i) => (
            <Finding key={i} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DraftSections({
  applicationId,
  sections,
  findings,
  openQuestions,
  locked,
}: {
  applicationId: string;
  sections: DraftSection[];
  findings: FindingsBySection;
  openQuestions: string[];
  locked: boolean;
}) {
  const general = findings.get('') ?? [];

  if (!sections.length) {
    return (
      <div style={{ color: 'var(--gf-muted)', fontSize: 12, padding: '10px 0' }}>
        No draft yet — run “Draft with ClaudIA” from the Pipeline first.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6 }}>
      {sections.map((s) => (
        <SectionRow
          key={s.id}
          applicationId={applicationId}
          section={s}
          findings={findings.get(s.key) ?? []}
          disabled={locked}
        />
      ))}

      {general.length > 0 && (
        <div style={{ borderTop: '1px solid var(--gf-border)', padding: '9px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Draft-wide findings</div>
          {general.map((f, i) => (
            <Finding key={i} f={f} />
          ))}
        </div>
      )}

      {openQuestions.length > 0 && (
        <div style={{ borderTop: '1px solid var(--gf-border)', padding: '9px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gf-gold)' }}>
            Steph must supply ({openQuestions.length})
          </div>
          <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 2 }}>
            ClaudIA left these blank rather than inventing them. They are not audit failures.
          </div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, lineHeight: 1.6 }}>
            {openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
