'use client';

import { useEffect, useMemo, useState } from 'react';
import { MESSAGE, ACKNOWLEDGMENT, AGREEMENT, PARTIES } from '@/lib/documents';
import { REALITY_STATS, VALUE_BANDS, RECORD_ROWS, RAILS, STACK } from '@/lib/audit';
import { vaultSign, vaultSignatures, VAULT_CODE, type VaultRole, type Signature } from '@/lib/vault';

/* ── animated infinity background (deterministic → no hydration mismatch) ── */
function InfinityField() {
  const items = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 53) % 100,
        size: 16 + ((i * 7) % 26),
        dur: 14 + ((i * 5) % 16),
        delay: -((i * 3) % 18),
        op: 0.25 + ((i % 4) * 0.12),
      })),
    [],
  );
  return (
    <>
      <div className="inf-orbit" aria-hidden>∞</div>
      <div className="inf-field" aria-hidden>
        {items.map((it, i) => (
          <span
            key={i}
            className="inf"
            style={{
              left: `${it.left}%`,
              fontSize: `${it.size}px`,
              animationDuration: `${it.dur}s`,
              animationDelay: `${it.delay}s`,
              ['--o' as string]: it.op,
            }}
          >
            ∞
          </span>
        ))}
      </div>
    </>
  );
}

function richText(s: string) {
  // render *italic* spans (used for EDITABLE markers)
  const parts = s.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : <span key={i}>{p}</span>,
  );
}

export function KeyVault() {
  const [role, setRole] = useState<VaultRole | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [turning, setTurning] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');

  function press(d: string) {
    if (turning || open) return;
    setErr(false);
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (next === VAULT_CODE && role) {
        setCode(next);
        setTurning(true);
        setTimeout(() => setOpen(true), 1250);
      } else {
        setErr(true);
        setTimeout(() => setPin(''), 600);
      }
    }
  }

  if (!open) {
    return (
      <div className="vault-root">
        <InfinityField />
        <div className="gate-wrap">
          <div className="vault-door">
            <div className={`keyring ${turning ? 'turning' : ''}`}>
              <span className="glyph">{turning ? '∞' : '⚷'}</span>
            </div>
            <div className="v-eyebrow" style={{ color: 'var(--v-violet)' }}>FlowScrow · Sealed Vault</div>
            <h1 className="v-h1" style={{ fontSize: 'clamp(26px,6vw,40px)' }}>
              {turning ? <span className="v-grad">Opening…</span> : 'Turn the key'}
            </h1>
            <p className="v-lead" style={{ fontSize: 14, margin: '0 0 18px' }}>
              {turning
                ? 'Welcome.'
                : 'Choose who you are, then enter your 4-digit code to open the recognition vault.'}
            </p>

            {!turning && (
              <>
                <div className="role-pick">
                  <button className={`role-btn ${role === 'steph' ? 'sel' : ''}`} onClick={() => setRole('steph')}>
                    Steph <small>Ferrera</small>
                  </button>
                  <button className={`role-btn ${role === 'russell' ? 'sel' : ''}`} onClick={() => setRole('russell')}>
                    Russell <small>Herod</small>
                  </button>
                </div>
                <div className="pin-dots">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`pin-dot ${err ? 'err' : pin.length > i ? 'on' : ''}`} />
                  ))}
                </div>
                <div className="keypad" style={{ opacity: role ? 1 : 0.4, pointerEvents: role ? 'auto' : 'none' }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <button key={d} className="key" onClick={() => press(d)}>{d}</button>
                  ))}
                  <button className="key" style={{ visibility: 'hidden' }} />
                  <button className="key" onClick={() => press('0')}>0</button>
                  <button className="key" onClick={() => setPin(pin.slice(0, -1))} aria-label="delete">⌫</button>
                </div>
                {!role && <p style={{ fontSize: 12, color: 'var(--v-dim)', marginTop: 12 }}>Pick a name to enable the keypad.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-root">
      <InfinityField />
      <Reveal role={role!} code={code} />
    </div>
  );
}

/* ─────────────────────────── the opened vault ─────────────────────────── */
function Reveal({ role, code }: { role: VaultRole; code: string }) {
  const [sigs, setSigs] = useState<Signature[]>([]);
  const me = PARTIES[role];

  useEffect(() => {
    vaultSignatures().then(setSigs).catch(() => {});
  }, []);
  function refresh() {
    vaultSignatures().then(setSigs).catch(() => {});
  }

  return (
    <div className="reveal enter">
      {/* HERO */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="v-eyebrow">Recognition, signed honestly</div>
        <h1 className="v-h1">
          The work, <span className="v-grad">named to the record.</span>
        </h1>
        <p className="v-lead" style={{ maxWidth: 640, margin: '6px auto 0' }}>
          Welcome, <b style={{ color: 'var(--v-ink)' }}>{me.short}</b>. This vault holds the separation
          agreement, a personal note, and a formal Acknowledgment of Contribution — alongside the real
          numbers behind FlowBond, so the recognition matches what actually happened. You can read,
          download, and sign here.
        </p>
      </div>

      {/* 1 — THE NOTE */}
      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">1 · The note</div>
        <h2 className="v-h2">Why the wording has to match the record</h2>
        <div className="v-card" style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--v-ink)', fontWeight: 600, margin: '0 0 10px' }}>Russell,</p>
          {MESSAGE.paragraphs.map((p, i) => (
            <p key={i} className="v-lead" style={{ margin: '0 0 14px' }}>{richText(p)}</p>
          ))}
          <p className="v-lead" style={{ whiteSpace: 'pre-line', margin: 0, color: 'var(--v-ink)' }}>{MESSAGE.signoff}</p>
        </div>
      </section>

      {/* 2 — THE RECORD (proposed vs reality) */}
      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">2 · The record</div>
        <h2 className="v-h2">Proposed credit vs. what the record shows</h2>
        <div className="v-card" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {RECORD_ROWS.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, alignItems: 'start', paddingBottom: 10, borderBottom: i < RECORD_ROWS.length - 1 ? '1px solid rgba(179,136,255,.14)' : 'none' }} className="rec-row">
              <div style={{ color: 'var(--v-magenta)', fontWeight: 600, fontSize: 14 }}>{r.implies}</div>
              <div className="v-lead" style={{ fontSize: 14 }}>{r.shows}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — THE REALITY (numbers) */}
      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">3 · The reality</div>
        <h2 className="v-h2">What FlowBond actually is, in numbers</h2>
        <p className="v-lead" style={{ margin: '4px 0 14px' }}>
          From the live org audit (generated from the GitHub org API, 2026-06-24). These are the same
          figures any investor sees — the reason a credit has to be sized to the truth.
        </p>
        <div className="stat-grid">
          {REALITY_STATS.map((s, i) => (
            <div className="stat" key={i}>
              <div className="n">{s.value}</div>
              <div className="l">{s.label}</div>
              <div className="s">{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="v-card" style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {VALUE_BANDS.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{b.label}</div>
                <div className="s" style={{ color: 'var(--v-dim)', fontSize: 12.5 }}>{b.note}</div>
              </div>
              <div className="v-grad" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.value}</div>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: 'var(--v-dim)', margin: '2px 0 0' }}>
            Neutral estimates, not an appraisal. Mostly pre-revenue; value is reach + a few real products + the identity thesis.
          </p>
        </div>
      </section>

      {/* 4 — THE STACK */}
      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">4 · The technology</div>
        <h2 className="v-h2">The full stack underneath it</h2>
        <p className="v-lead" style={{ margin: '4px 0 14px' }}>
          One coherent platform — identity, money rails, on-chain proof, zero-knowledge crypto and AI —
          shipped across ~43 projects. Eight of those are proprietary, monetizable rails.
        </p>
        <div className="v-card" style={{ display: 'grid', gap: 14 }}>
          {STACK.map((g) => (
            <div key={g.layer}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v-violet)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{g.layer}</div>
              <div className="tech-row">{g.items.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="v-card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>The monetizable rails (the moat)</div>
          <div className="tech-row">
            {RAILS.map((r) => (
              <span className="chip" key={r.name} title={r.what} style={{ borderColor: 'rgba(245,215,122,.35)' }}>
                {r.name} · {r.ready}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — THE DOCUMENTS (download + sign) */}
      <section id="sign">
        <div className="v-eyebrow">5 · The documents</div>
        <h2 className="v-h2">Read, download &amp; sign</h2>
        <p className="v-lead" style={{ margin: '4px 0 16px' }}>
          Two documents sit in escrow: the <b style={{ color: 'var(--v-ink)' }}>Separation &amp; Transition
          Agreement</b> (the binding closing) and, alongside it, the <b style={{ color: 'var(--v-ink)' }}>
          Acknowledgment of Contribution</b> (Exhibit 5 — the letter). Read, download, or sign either.
        </p>

        <div style={{ marginBottom: 8 }} className="v-eyebrow">Document 1 — Separation Agreement</div>
        <AgreementPaper role={role} code={code} sigs={sigs} onSigned={refresh} />

        <div style={{ margin: '28px 0 8px' }} className="v-eyebrow">Document 2 — Acknowledgment of Contribution (Exhibit 5)</div>
        <Acknowledgment role={role} code={code} sigs={sigs} onSigned={refresh} />
      </section>

      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: 'var(--v-dim)' }} className="v-noprint">
        FlowScrow coordinates and records this closing and conditionally releases documents once each task is
        verified. Binding signatures are executed via DocuSign and confirmed by counsel; any on-chain record
        is a tamper-evident timestamp, not a legal signature. This tool does not provide legal advice.
      </p>
    </div>
  );
}

/* ── shared sign + download controls ── */
function SignControls({
  role, code, document, sigs, onSigned, buildText, filename,
}: {
  role: VaultRole; code: string; document: 'agreement' | 'acknowledgment';
  sigs: Signature[]; onSigned: () => void; buildText: () => string; filename: string;
}) {
  const [name, setName] = useState(PARTIES[role].full);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mySig = sigs.find((s) => s.party_role === role && s.document === document);

  async function sign() {
    setBusy(true); setErr(null);
    try { await vaultSign(role, code, name, document); onSigned(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  function download() {
    const blob = new Blob([buildText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document_.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }
  // (document is a prop name here; use the global via document_)
  const document_ = globalThis.document;

  return (
    <div className="v-card v-noprint" style={{ marginTop: 14 }}>
      {mySig ? (
        <div style={{ color: 'var(--v-gold)', fontWeight: 700 }}>
          ✓ Signed as {mySig.signer_name} · {new Date(mySig.signed_at).toLocaleString()}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
            style={{ flex: 1, minWidth: 200, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(179,136,255,.3)', borderRadius: 10, padding: '11px 13px', color: 'var(--v-ink)', fontSize: 15 }} />
          <button className="vbtn vbtn-gold" disabled={busy} onClick={sign}>
            {busy ? 'Signing…' : `Sign as ${PARTIES[role].short}`}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="vbtn vbtn-ghost" onClick={download}>⬇ Download (.txt)</button>
        <button className="vbtn vbtn-ghost" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
      </div>
      {err && <p style={{ color: '#ff8aa3', fontSize: 13, marginTop: 10 }}>{err}</p>}
    </div>
  );
}

/* ── the Separation & Transition Agreement paper ── */
function AgreementPaper({ role, code, sigs, onSigned }: { role: VaultRole; code: string; sigs: Signature[]; onSigned: () => void }) {
  const g = AGREEMENT;
  const stephSigned = sigs.find((s) => s.party_role === 'steph' && s.document === 'agreement');
  const russellSigned = sigs.find((s) => s.party_role === 'russell' && s.document === 'agreement');
  const buildText = () =>
    [
      g.title, g.subtitle, '', `Effective: ${g.effective.replace(/\*/g, '')}`, '',
      g.parties, '', 'Recitals:', ...g.recitals.map((r) => ' - ' + r), '',
      ...g.clauses.flatMap((c) => [c.h, c.b, '']),
      'Exhibits:', ...g.exhibits.map((e) => ' - ' + e), '',
      'Signed:', '', 'Steph Ferrera — ______________________   Date: __________', '',
      'Russell Herod — ______________________   Date: __________',
      ...sigs.filter((s) => s.document === 'agreement').map((s) => `\n[signed in vault] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
    ].join('\n');

  return (
    <>
      <div className="doc-paper" style={{ marginTop: 12 }}>
        <h3>{g.title}</h3>
        <div className="meta">{g.subtitle} · Effective {richText(g.effective)}</div>
        <p style={{ margin: '14px 0' }}>{g.parties}</p>
        <p style={{ margin: '8px 0 4px', fontWeight: 700 }}>Recitals</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          {g.recitals.map((r, i) => <li key={i} style={{ margin: '4px 0' }}>{r}</li>)}
        </ul>
        {g.clauses.map((c, i) => (
          <p key={i} style={{ margin: '12px 0' }}><b>{c.h}.</b> {richText(c.b)}</p>
        ))}
        <p style={{ margin: '12px 0 4px', fontWeight: 700 }}>Exhibits</p>
        <ul style={{ margin: '0', paddingLeft: 20 }}>
          {g.exhibits.map((e, i) => <li key={i} style={{ margin: '4px 0' }}>{e}</li>)}
        </ul>
        <p style={{ fontSize: 12.5, color: '#6b5b8c', marginTop: 14 }}>
          Draft framework for review with counsel — not legal advice. Binding execution via DocuSign.
        </p>
        <div className="sig-line">
          <span><b>Steph Ferrera</b> {stephSigned ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> {russellSigned ? '✓ signed' : '— ____________'}</span>
        </div>
      </div>
      <SignControls role={role} code={code} document="agreement" sigs={sigs} onSigned={onSigned}
        buildText={buildText} filename="Separation-Agreement.txt" />
    </>
  );
}

/* ── the signable Acknowledgment paper ── */
function Acknowledgment({ role, code, sigs, onSigned }: { role: VaultRole; code: string; sigs: Signature[]; onSigned: () => void }) {
  const a = ACKNOWLEDGMENT;
  const buildText = () =>
    [
      a.title, '',
      `Issued by: ${a.issuedBy}`,
      `In recognition of: ${a.recognitionOf}`,
      `Role: ${a.role}`,
      `Period: ${a.period.replace(/\*/g, '')}`, '',
      'Scope of contribution:',
      ...a.scope.map((s) => ' - ' + s.replace(/\*/g, '')), '',
      'Acknowledgment. ' + a.acknowledgment, '',
      'Scope & clarity. ' + a.scopeClarity, '',
      'Acknowledged and agreed:', '',
      'Steph Ferrera — ______________________   Date: __________', '',
      'Russell Herod — ______________________   Date: __________',
      ...sigs.filter((s) => s.document === 'acknowledgment').map((s) => `\n[signed in vault] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
    ].join('\n');

  return (
    <>
      <div className="doc-paper" style={{ marginTop: 12 }}>
        <h3>{a.title}</h3>
        <div className="meta">
          Issued by <b>{a.issuedBy}</b> · In recognition of <b>{a.recognitionOf}</b>
        </div>
        <p style={{ margin: '14px 0 4px' }}><b>Role:</b> {a.role}</p>
        <p style={{ margin: '0 0 4px' }}><b>Period:</b> {richText(a.period)}</p>
        <p style={{ margin: '8px 0 4px' }}><b>Scope of contribution</b></p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          {a.scope.map((s, i) => <li key={i} style={{ margin: '4px 0' }}>{richText(s)}</li>)}
        </ul>
        <p><b>Acknowledgment.</b> {a.acknowledgment}</p>
        <p style={{ fontSize: 13.5, color: '#4a3a6c' }}><b>Scope &amp; clarity.</b> {a.scopeClarity}</p>
        <div className="sig-line">
          <span><b>Steph Ferrera</b> {sigs.find((s) => s.party_role === 'steph' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> {sigs.find((s) => s.party_role === 'russell' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
        </div>
      </div>
      <SignControls role={role} code={code} document="acknowledgment" sigs={sigs} onSigned={onSigned}
        buildText={buildText} filename="Acknowledgment-of-Contribution.txt" />
    </>
  );
}
