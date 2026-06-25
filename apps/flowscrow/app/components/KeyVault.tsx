'use client';

import { useEffect, useMemo, useState } from 'react';
import { keccak256, toHex } from 'viem';
import { MESSAGE, ACKNOWLEDGMENT, AGREEMENT, STANDING, WITNESSES, PARTIES } from '@/lib/documents';
import { REALITY_STATS, VALUE_BANDS, RECORD_ROWS, RAILS, STACK } from '@/lib/audit';
import {
  vaultSign, vaultSignatures, vaultWitness, vaultWitnesses, isWitnessName, VAULT_CODE,
  type VaultRole, type Signature, type Witness,
} from '@/lib/vault';
import { apiUrl } from '@/lib/path';

type Access = { mode: 'party'; role: VaultRole } | { mode: 'witness'; name: string };

/* ── animated infinity background (deterministic → no hydration mismatch) ── */
function InfinityField() {
  const items = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: (i * 53) % 100, size: 16 + ((i * 7) % 26),
      dur: 14 + ((i * 5) % 16), delay: -((i * 3) % 18),
    })),
    [],
  );
  return (
    <>
      <div className="inf-orbit" aria-hidden>∞</div>
      <div className="inf-field" aria-hidden>
        {items.map((it, i) => (
          <span key={i} className="inf" style={{ left: `${it.left}%`, fontSize: `${it.size}px`, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s` }}>∞</span>
        ))}
      </div>
    </>
  );
}

function richText(s: string) {
  const parts = s.split(/(\*[^*]+\*|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i} className="gold">{p.slice(2, -2)}</b>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

export function KeyVault() {
  const [role, setRole] = useState<VaultRole | null>(null);
  const [witnessMode, setWitnessMode] = useState(false);
  const [wname, setWname] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [turning, setTurning] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);

  const canType = witnessMode ? isWitnessName(wname) : !!role;

  function press(d: string) {
    if (turning || access) return;
    setErr(false);
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      const ok = next === VAULT_CODE && canType;
      if (!ok) { setErr(true); setTimeout(() => setPin(''), 600); return; }
      setTurning(true);
      setTimeout(async () => {
        if (witnessMode) {
          const nm = wname.trim();
          try { await vaultWitness(nm, next); } catch { /* non-fatal */ }
          setAccess({ mode: 'witness', name: nm.charAt(0).toUpperCase() + nm.slice(1).toLowerCase() });
        } else {
          setAccess({ mode: 'party', role: role! });
        }
      }, 1250);
    }
  }

  if (!access) {
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
              {turning ? 'Welcome.' : witnessMode
                ? 'Enter your name and the 4-digit code to witness.'
                : 'Choose who you are, then enter your 4-digit code to open the vault.'}
            </p>

            {!turning && (
              <>
                {!witnessMode ? (
                  <div className="role-pick">
                    <button className={`role-btn ${role === 'steph' ? 'sel' : ''}`} onClick={() => setRole('steph')}>
                      Steph <small>Estefanía Ferrera</small>
                    </button>
                    <button className={`role-btn ${role === 'russell' ? 'sel' : ''}`} onClick={() => setRole('russell')}>
                      Russell <small>Early Co-founder</small>
                    </button>
                  </div>
                ) : (
                  <input
                    className="field" placeholder="Your name" value={wname} autoFocus
                    onChange={(e) => setWname(e.target.value)} aria-label="Witness name"
                    style={{ textAlign: 'center', margin: '2px 0 4px' }}
                  />
                )}

                <div className="pin-dots">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`pin-dot ${err ? 'err' : pin.length > i ? 'on' : ''}`} />
                  ))}
                </div>
                <div className="keypad" style={{ opacity: canType ? 1 : 0.4, pointerEvents: canType ? 'auto' : 'none' }}>
                  {['1','2','3','4','5','6','7','8','9'].map((d) => (
                    <button key={d} className="key" onClick={() => press(d)}>{d}</button>
                  ))}
                  <button className="key" style={{ visibility: 'hidden' }} />
                  <button className="key" onClick={() => press('0')}>0</button>
                  <button className="key" onClick={() => setPin(pin.slice(0, -1))} aria-label="delete">⌫</button>
                </div>

                <button
                  onClick={() => { setWitnessMode(!witnessMode); setRole(null); setWname(''); setPin(''); setErr(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--v-dim)', fontSize: 12, marginTop: 14, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {witnessMode ? '← Back to signing in' : 'Attending as a witness?'}
                </button>
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
      <Reveal access={access} />
    </div>
  );
}

/* ── transparent "where we stand today" panel ── */
function StandingPanel() {
  const tone = (t: string) => (t === 'good' ? '#8FA98F' : t === 'pending' ? 'var(--v-gold)' : 'var(--v-violet)');
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="v-eyebrow">Where we stand today</div>
      <h2 className="v-h2">The standing, in plain terms</h2>
      <p className="v-lead" style={{ margin: '4px 0 12px' }}>
        Nothing hidden. This is exactly where we stand as of today — the same facts the cryptographic
        record, the witnesses, and the audit trail attest to.
      </p>
      <div className="v-card" style={{ display: 'grid', gap: 0 }}>
        {STANDING.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '11px 0', borderTop: i ? '1px solid rgba(179,136,255,.12)' : 'none', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--v-ink)' }}>{s.k}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: tone(s.tone), textAlign: 'right' }}>{s.v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── the opened vault ─────────────────────────── */
function Reveal({ access }: { access: Access }) {
  const [sigs, setSigs] = useState<Signature[]>([]);
  const [wits, setWits] = useState<Witness[]>([]);
  const readOnly = access.mode === 'witness';
  const role = access.mode === 'party' ? access.role : null;
  const who = access.mode === 'party' ? PARTIES[access.role].short : access.name;

  useEffect(() => {
    vaultSignatures().then(setSigs).catch(() => {});
    vaultWitnesses().then(setWits).catch(() => {});
  }, []);
  const refresh = () => { vaultSignatures().then(setSigs).catch(() => {}); };

  return (
    <div className="reveal enter">
      {readOnly && (
        <div className="v-card v-noprint" style={{ marginBottom: 18, borderColor: 'rgba(245,215,122,.4)', textAlign: 'center' }}>
          <b className="gold">Witness · view only</b> — welcome, {who}. You may read and verify these documents.
          Witnesses do not download or sign. Your attendance is recorded on the audit trail.
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="v-eyebrow">Recognition, signed honestly</div>
        <h1 className="v-h1">The work, <span className="v-grad">named to the record.</span></h1>
        <p className="v-lead" style={{ maxWidth: 660, margin: '6px auto 0' }}>
          Welcome, <b style={{ color: 'var(--v-ink)' }}>{who}</b>. This vault holds the Separation Agreement
          and the Acknowledgment of Contribution — recognizing <b style={{ color: 'var(--v-ink)' }}>Russell</b> as
          an <b className="gold">Early Co-founder</b> of DANZ &amp; FlowB and acknowledging <b style={{ color: 'var(--v-ink)' }}>Deven</b> —
          alongside the real numbers, validated by cryptography and witnessed on the record.
        </p>
      </div>

      <StandingPanel />

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">1 · The note</div>
        <h2 className="v-h2">We found the honest name: Early Co-founder</h2>
        <div className="v-card" style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--v-ink)', fontWeight: 600, margin: '0 0 10px' }}>Russell,</p>
          {MESSAGE.paragraphs.map((p, i) => (
            <p key={i} className="v-lead" style={{ margin: '0 0 14px' }}>{richText(p)}</p>
          ))}
          <p className="v-lead" style={{ whiteSpace: 'pre-line', margin: 0, color: 'var(--v-ink)' }}>{MESSAGE.signoff}</p>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">2 · The record</div>
        <h2 className="v-h2">Proposed credit vs. what the record shows</h2>
        <div className="v-card" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {RECORD_ROWS.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, alignItems: 'start', paddingBottom: 10, borderBottom: i < RECORD_ROWS.length - 1 ? '1px solid rgba(179,136,255,.14)' : 'none' }}>
              <div style={{ color: 'var(--v-magenta)', fontWeight: 600, fontSize: 14 }}>{r.implies}</div>
              <div className="v-lead" style={{ fontSize: 14 }}>{r.shows}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">3 · The reality</div>
        <h2 className="v-h2">What FlowBond actually is, in numbers</h2>
        <p className="v-lead" style={{ margin: '4px 0 14px' }}>
          From the live org audit (GitHub org API, 2026-06-24). The same figures any investor sees.
        </p>
        <div className="stat-grid">
          {REALITY_STATS.map((s, i) => (
            <div className="stat" key={i}><div className="n">{s.value}</div><div className="l">{s.label}</div><div className="s">{s.sub}</div></div>
          ))}
        </div>
        <div className="v-card" style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {VALUE_BANDS.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>{b.label}</div><div className="s" style={{ color: 'var(--v-dim)', fontSize: 12.5 }}>{b.note}</div></div>
              <div className="v-grad" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">4 · The technology</div>
        <h2 className="v-h2">The full stack underneath it</h2>
        <div className="v-card" style={{ display: 'grid', gap: 14, marginTop: 12 }}>
          {STACK.map((g) => (
            <div key={g.layer}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v-violet)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{g.layer}</div>
              <div className="tech-row">{g.items.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v-gold)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Monetizable rails (the moat)</div>
            <div className="tech-row">{RAILS.map((r) => <span className="chip" key={r.name} title={r.what} style={{ borderColor: 'rgba(245,215,122,.35)' }}>{r.name} · {r.ready}</span>)}</div>
          </div>
        </div>
      </section>

      <section id="sign">
        <div className="v-eyebrow">5 · The documents</div>
        <h2 className="v-h2">{readOnly ? 'Read & verify' : 'Read, download & sign'}</h2>
        <p className="v-lead" style={{ margin: '4px 0 16px' }}>
          Two documents sit in escrow: the <b style={{ color: 'var(--v-ink)' }}>Separation &amp; Transition Agreement</b> and
          the <b style={{ color: 'var(--v-ink)' }}>Acknowledgment of Contribution</b> (Exhibit 5). Only Estefanía and
          Russell sign; the named witnesses verify.
        </p>

        <div className="v-eyebrow" style={{ marginBottom: 8 }}>Document 1 — Separation Agreement</div>
        <AgreementPaper role={role} code={VAULT_CODE} readOnly={readOnly} sigs={sigs} wits={wits} onSigned={refresh} />

        <div className="v-eyebrow" style={{ margin: '28px 0 8px' }}>Document 2 — Acknowledgment of Contribution (Exhibit 5)</div>
        <Acknowledgment role={role} code={VAULT_CODE} readOnly={readOnly} sigs={sigs} onSigned={refresh} />
      </section>

      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: 'var(--v-dim)' }} className="v-noprint">
        FlowScrow coordinates and records this closing and conditionally releases documents once each task is
        verified. Binding signatures are executed via DocuSign and confirmed by counsel; any on-chain record is a
        tamper-evident timestamp, not a legal signature. This tool does not provide legal advice.
      </p>
    </div>
  );
}

/* ── shared sign + download controls (party only) ── */
function SignControls({
  role, code, document, sigs, onSigned, buildText, filename, showDocuSign,
}: {
  role: VaultRole; code: string; document: 'agreement' | 'acknowledgment';
  sigs: Signature[]; onSigned: () => void; buildText: () => string; filename: string; showDocuSign?: boolean;
}) {
  const [name, setName] = useState(PARTIES[role].full);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ds, setDs] = useState<string | null>(null);
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
    const link = globalThis.document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }
  async function sendDocuSign() {
    setDs('Sending…');
    try {
      const res = await fetch(apiUrl('/api/docusign/send'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'agreement' }) });
      const j = await res.json().catch(() => ({}));
      setDs(res.ok ? '✓ Sent for signature via DocuSign.' : `DocuSign: ${j.error ?? 'not configured'}`);
    } catch (e) { setDs(`DocuSign: ${(e as Error).message}`); }
  }

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
          <button className="vbtn vbtn-gold" disabled={busy} onClick={sign}>{busy ? 'Signing…' : `Sign as ${PARTIES[role].short}`}</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="vbtn vbtn-ghost" onClick={download}>⬇ Download (.txt)</button>
        <button className="vbtn vbtn-ghost" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        {showDocuSign && <button className="vbtn vbtn-ghost" onClick={sendDocuSign}>✍️ Send for signature (DocuSign)</button>}
      </div>
      {ds && <p style={{ fontSize: 12.5, color: ds.startsWith('✓') ? 'var(--v-gold)' : '#ffb27a', marginTop: 10 }}>{ds}</p>}
      {err && <p style={{ color: '#ff8aa3', fontSize: 13, marginTop: 10 }}>{err}</p>}
    </div>
  );
}

function WitnessOnly() {
  return (
    <div className="v-card v-noprint" style={{ marginTop: 14 }}>
      <span className="pill" style={{ color: 'var(--v-gold)' }}>witness · view only</span>
      <p style={{ fontSize: 12.5, color: 'var(--v-dim)', margin: '8px 0 0' }}>You are recorded as a witness. Witnesses verify but do not download or sign.</p>
    </div>
  );
}

/* ── the Separation & Transition Agreement paper ── */
function AgreementPaper({ role, code, readOnly, sigs, wits, onSigned }: { role: VaultRole | null; code: string; readOnly: boolean; sigs: Signature[]; wits: Witness[]; onSigned: () => void }) {
  const g = AGREEMENT;
  const stephSigned = sigs.find((s) => s.party_role === 'steph' && s.document === 'agreement');
  const russellSigned = sigs.find((s) => s.party_role === 'russell' && s.document === 'agreement');
  const buildText = () =>
    [
      g.title.toUpperCase(), g.subtitle, '', `Effective Date: ${g.effective.replace(/\*/g, '')}`, '',
      g.parties, '', 'RECITALS', ...g.recitals.map((r) => '  ' + r), '',
      ...g.articles.flatMap((a) => [`ARTICLE ${a.n} — ${a.t.toUpperCase()}`, ...a.paras.map((p) => '  ' + p.replace(/\*/g, '')), '']),
      'EXHIBITS', ...g.exhibits.map((e) => '  ' + e), '',
      'IN WITNESS WHEREOF, the Parties execute this Agreement as of the Effective Date.', '',
      'Estefanía Ferrera (Company) — ______________________   Date: __________', '',
      'Russell Herod (Early Co-founder) — ______________________   Date: __________', '',
      'Witnesses (view-only): ' + WITNESSES.join(', '),
      ...sigs.filter((s) => s.document === 'agreement').map((s) => `\n[electronically signed in vault] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
    ].join('\n');
  const fingerprint = useMemo(() => keccak256(toHex(buildText())), [sigs]);

  return (
    <>
      <div className="doc-paper" style={{ marginTop: 12 }}>
        <h3>{g.title}</h3>
        <div className="meta">{g.subtitle} · Effective Date {richText(g.effective)}</div>
        <p style={{ margin: '14px 0' }}>{g.parties}</p>
        <p style={{ margin: '14px 0 6px', fontWeight: 700, letterSpacing: '.04em' }}>RECITALS</p>
        {g.recitals.map((r, i) => <p key={i} style={{ margin: '6px 0', fontSize: 14 }}>{r}</p>)}
        {g.articles.map((a) => (
          <div key={a.n} style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>ARTICLE {a.n} — {a.t}</p>
            {a.paras.map((p, j) => <p key={j} style={{ margin: '6px 0', fontSize: 14 }}>{richText(p)}</p>)}
          </div>
        ))}
        <p style={{ margin: '14px 0 4px', fontWeight: 700 }}>EXHIBITS</p>
        <ul style={{ margin: '0', paddingLeft: 20 }}>{g.exhibits.map((e, i) => <li key={i} style={{ margin: '4px 0' }}>{e}</li>)}</ul>
        <div className="sig-line">
          <span><b>Estefanía Ferrera</b> (Company) {stephSigned ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> (Early Co-founder) {russellSigned ? '✓ signed' : '— ____________'}</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: '#4a3a6c' }}>
          <b>Witnesses (view-only):</b>{' '}
          {WITNESSES.map((w) => {
            const seen = wits.find((x) => x.name.toLowerCase() === w.toLowerCase());
            return <span key={w} style={{ marginRight: 10 }}>{w}{seen ? ' ✓' : ''}</span>;
          })}
        </div>
      </div>

      <div className="v-card" style={{ marginTop: 14, borderColor: 'rgba(245,215,122,.4)' }}>
        <div className="v-eyebrow" style={{ color: 'var(--v-gold)' }}>Cryptographic validation · Article 11</div>
        <p className="v-lead" style={{ fontSize: 13.5, margin: '6px 0 10px' }}>
          Counsel was offered and declined. This Agreement instead stands on objective, tamper-evident proof anyone
          can verify — not on any one advisor’s word. This is the seal of the exact text above; change a single
          character and it changes.
        </p>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--v-violet)', wordBreak: 'break-all', background: 'rgba(0,0,0,.25)', padding: '10px 12px', borderRadius: 10 }}>
          keccak256 · {fingerprint}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--v-dim)' }}>
          <span>🔒 Immutable audit trail</span><span>⛓ Anchorable on Base</span><span>✍️ Binding e-signature (ESIGN/UETA)</span><span>👁 Witnessed</span>
        </div>
      </div>

      {readOnly || !role
        ? <WitnessOnly />
        : <SignControls role={role} code={code} document="agreement" sigs={sigs} onSigned={onSigned} buildText={buildText} filename="Separation-Agreement.txt" showDocuSign />}
    </>
  );
}

/* ── the signable Acknowledgment paper ── */
function Acknowledgment({ role, code, readOnly, sigs, onSigned }: { role: VaultRole | null; code: string; readOnly: boolean; sigs: Signature[]; onSigned: () => void }) {
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
      `Also acknowledged — ${a.deven.name} (${a.deven.role.replace(/\*/g, '')}): ${a.deven.text.replace(/\*/g, '')}`, '',
      'Scope & clarity. ' + a.scopeClarity, '',
      'Acknowledged and agreed:', '',
      'Estefanía Ferrera — ______________________   Date: __________', '',
      'Russell Herod — ______________________   Date: __________',
      ...sigs.filter((s) => s.document === 'acknowledgment').map((s) => `\n[signed in vault] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
    ].join('\n');

  return (
    <>
      <div className="doc-paper" style={{ marginTop: 12 }}>
        <h3>{a.title}</h3>
        <div className="meta">Issued by <b>{a.issuedBy}</b> · In recognition of <b>{a.recognitionOf}</b></div>
        <p style={{ margin: '14px 0 4px' }}><b>Role:</b> <span className="gold">{a.role}</span></p>
        <p style={{ margin: '0 0 4px' }}><b>Period:</b> {richText(a.period)}</p>
        <p style={{ margin: '8px 0 4px' }}><b>Scope of contribution</b></p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>{a.scope.map((s, i) => <li key={i} style={{ margin: '4px 0' }}>{richText(s)}</li>)}</ul>
        <p><b>Acknowledgment.</b> {a.acknowledgment}</p>
        <div style={{ borderLeft: '3px solid #8a5cff', paddingLeft: 14, margin: '14px 0' }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700 }}>Also acknowledged — {a.deven.name} <span style={{ fontWeight: 400, color: '#6b5b8c' }}>({richText(a.deven.role)})</span></p>
          <p style={{ margin: 0, fontSize: 14 }}>{richText(a.deven.text)}</p>
        </div>
        <p style={{ fontSize: 13.5, color: '#4a3a6c' }}><b>Scope &amp; clarity.</b> {a.scopeClarity}</p>
        <div className="sig-line">
          <span><b>Estefanía Ferrera</b> {sigs.find((s) => s.party_role === 'steph' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> {sigs.find((s) => s.party_role === 'russell' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
        </div>
      </div>
      {readOnly || !role
        ? <WitnessOnly />
        : <SignControls role={role} code={code} document="acknowledgment" sigs={sigs} onSigned={onSigned} buildText={buildText} filename="Acknowledgment-of-Contribution.txt" />}
    </>
  );
}
