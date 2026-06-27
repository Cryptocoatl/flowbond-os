'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { keccak256, toHex } from 'viem';
import { MESSAGE, ACKNOWLEDGMENT, AGREEMENT, STANDING, WITNESSES, PERSONAL, PARTIES, FINALIZE_STEPS, GUIDE_FAQ } from '@/lib/documents';
import { REALITY_STATS, VALUE_BANDS, RECORD_ROWS, RAILS, STACK } from '@/lib/audit';
import {
  vaultResolve, vaultAuthorized, vaultSign, vaultWitness, vaultSignatures, vaultWitnesses, sessionEmail,
  vaultComment, vaultComments,
  type VaultRole, type Signature, type Witness, type Resolved, type VaultComment,
} from '@/lib/vault';
import { hubRedirect } from '@flowbond/auth';
import { apiUrl } from '@/lib/path';

const CODE_LEN = 6;
const SS_KEY = 'fs_vault_code';

/* ── animated infinity background (deterministic → no hydration mismatch) ── */
function InfinityField() {
  const items = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: (i * 53) % 100, size: 16 + ((i * 7) % 26), dur: 14 + ((i * 5) % 16), delay: -((i * 3) % 18),
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
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i} className="gold">{p.slice(2, -2)}</b>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

/* ── living cryptographic Proof Seal — a unique animated sigil derived from the
   document's keccak256 fingerprint. The hash made visible. Pure canvas, no deps. ── */
function ProofSeal({ hash, size = 220, sealed = false }: { hash: string; size?: number; sealed?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const hex = hash.replace(/^0x/, '');
    const b: number[] = [];
    for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.substr(i, 2), 16) || 0);
    const cx = size / 2;
    const cy = size / 2;
    const rings = 4 + (b[0] % 4);
    let t = 0;
    let raf = 0;
    const draw = () => {
      t += 0.006;
      ctx.clearRect(0, 0, size, size);
      // soft core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      g.addColorStop(0, sealed ? 'rgba(245,215,122,0.16)' : 'rgba(124,77,255,0.16)');
      g.addColorStop(1, 'rgba(10,4,24,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      for (let r = 0; r < rings; r++) {
        const radius = size * 0.1 + r * ((size * 0.36) / rings);
        const nodes = 6 + (b[(r + 1) % b.length] % 11);
        const rot = t * (r % 2 ? -1 : 1) * (0.35 + (b[(r + 2) % b.length] % 5) * 0.08);
        const hue = sealed ? 44 + (b[r % b.length] % 14) : 262 + (b[r % b.length] % 64);
        // ring path with wobble
        ctx.beginPath();
        for (let n = 0; n <= nodes; n++) {
          const a = rot + (n / nodes) * Math.PI * 2;
          const rr = radius + Math.sin(t * 2 + n * 1.3 + r) * size * 0.013;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          n === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${hue},90%,72%,${0.55 - r * 0.05})`;
        ctx.lineWidth = 1.1;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `hsla(${hue},90%,68%,0.85)`;
        ctx.stroke();
        // nodes + radial spokes
        for (let n = 0; n < nodes; n++) {
          const a = rot + (n / nodes) * Math.PI * 2;
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * radius;
          const pulse = 1.4 + Math.sin(t * 3 + n + r) * 1;
          const gold = b[(r * 3 + n) % b.length] % 5 === 0;
          ctx.beginPath();
          ctx.arc(x, y, (b[(r + n) % b.length] % 2) + pulse, 0, Math.PI * 2);
          ctx.fillStyle = gold ? '#f5d77a' : `hsla(${hue},92%,76%,0.95)`;
          ctx.fill();
        }
      }
      // center infinity, breathing
      ctx.shadowBlur = 22;
      ctx.shadowColor = sealed ? '#f5d77a' : '#b388ff';
      ctx.fillStyle = sealed ? '#f5d77a' : '#cdb4ff';
      ctx.font = `${size * 0.15}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.75 + Math.sin(t * 2) * 0.22;
      ctx.fillText('∞', cx, cy);
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [hash, size, sealed]);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block', margin: '0 auto' }} aria-hidden />;
}

export function KeyVault() {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [turning, setTurning] = useState(false);
  const [access, setAccess] = useState<{ code: string; r: Resolved } | null>(null);

  // Resume after an FBID login round-trip. localStorage (not sessionStorage) so the
  // code survives the magic-link opening in a new tab — you land back signed-in.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SS_KEY) : null;
    if (!saved) return;
    vaultResolve(saved).then((r) => { if (r) setAccess({ code: saved, r }); }).catch(() => {});
  }, []);

  async function complete(code: string) {
    setTurning(true);
    let r: Resolved | null = null;
    try { r = await vaultResolve(code); } catch { /* ignore */ }
    if (!r) { setTurning(false); setErr(true); setTimeout(() => setPin(''), 600); return; }
    if (r.kind === 'witness') { try { await vaultWitness(code); } catch { /* non-fatal */ } }
    localStorage.setItem(SS_KEY, code);
    setTimeout(() => setAccess({ code, r: r! }), 1100);
  }

  function press(d: string) {
    if (turning || access) return;
    setErr(false);
    const next = (pin + d).slice(0, CODE_LEN);
    setPin(next);
    if (next.length === CODE_LEN) complete(next);
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
              {turning ? <span className="v-grad">Opening…</span> : 'Enter your code'}
            </h1>
            <p className="v-lead" style={{ fontSize: 14, margin: '0 0 18px' }}>
              {turning ? 'Welcome.' : 'Each person has a private 6-digit code. Enter yours to open the vault.'}
            </p>

            {!turning && (
              <>
                <div className="pin-dots">
                  {Array.from({ length: CODE_LEN }).map((_, i) => (
                    <span key={i} className={`pin-dot ${err ? 'err' : pin.length > i ? 'on' : ''}`} />
                  ))}
                </div>
                <div className="keypad">
                  {['1','2','3','4','5','6','7','8','9'].map((d) => (
                    <button key={d} className="key" onClick={() => press(d)}>{d}</button>
                  ))}
                  <button className="key" style={{ visibility: 'hidden' }} />
                  <button className="key" onClick={() => press('0')}>0</button>
                  <button className="key" onClick={() => setPin(pin.slice(0, -1))} aria-label="delete">⌫</button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--v-dim)', marginTop: 14 }}>
                  Signers (Estefanía, Russell) verify with FBID to sign &amp; download. Witnesses view only.
                </p>
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
      <Reveal code={access.code} r={access.r} />
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
        Nothing hidden. This is exactly where we stand as of today — the same facts the cryptographic record,
        the witnesses, and the audit trail attest to.
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

/* ── discussion / request-a-modification thread ── */
function CommentBox({ code, who }: { code: string; who: string }) {
  const [list, setList] = useState<VaultComment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { vaultComments().then(setList).catch(() => {}); }, []);
  async function send() {
    if (!text.trim()) return;
    setBusy(true); setErr(null);
    try { await vaultComment(code, text); setText(''); setList(await vaultComments()); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <section id="discuss" style={{ marginTop: 30 }}>
      <div className="v-eyebrow">Discussion · request a modification</div>
      <h2 className="v-h2">Anything to change before signing?</h2>
      <p className="v-lead" style={{ margin: '4px 0 12px' }}>
        If you’d like a wording change or have a question, leave it here instead of signing — Estefanía sees it and
        responds. Signing means you accept the agreement as written.
      </p>
      <div className="v-card v-noprint">
        {list.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {list.map((c) => (
              <div key={c.id} style={{ background: 'rgba(124,77,255,.1)', border: '1px solid rgba(179,136,255,.2)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 12, color: 'var(--v-gold)', fontWeight: 700 }}>{c.name} <span style={{ color: 'var(--v-dim)', fontWeight: 400 }}>· {new Date(c.created_at).toLocaleString()}</span></div>
                <div style={{ fontSize: 13.5, marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              </div>
            ))}
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder={`Request a change or leave a comment as ${who}…`}
          style={{ width: '100%', background: 'rgba(0,0,0,.25)', border: '1px solid rgba(179,136,255,.3)', borderRadius: 10, padding: '11px 13px', color: 'var(--v-ink)', fontSize: 14, resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="vbtn vbtn-ghost" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send comment'}</button>
        </div>
        {err && <p style={{ color: '#ff8aa3', fontSize: 13, marginTop: 8 }}>{err}</p>}
      </div>
    </section>
  );
}

/* ── Russell's step-by-step finalize guide + ClaudIA chat ── */
function RussellGuide({ sigs, authorized }: { sigs: Signature[]; authorized: boolean }) {
  const done = (key: string) => {
    if (key === 'fbid') return authorized;
    if (key === 'sign-agreement') return !!sigs.find((s) => s.party_role === 'russell' && s.document === 'agreement');
    if (key === 'sign-ack') return !!sigs.find((s) => s.party_role === 'russell' && s.document === 'acknowledgment');
    return false;
  };
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="v-eyebrow" style={{ color: 'var(--v-gold)' }}>Your guide · finalize every step</div>
      <h2 className="v-h2">Russell — here’s exactly how to close, step by step</h2>
      <div className="v-card" style={{ display: 'grid', gap: 0, marginTop: 12 }}>
        {FINALIZE_STEPS.map((s, i) => {
          const d = done(s.key);
          return (
            <div key={s.n} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: i ? '1px solid rgba(179,136,255,.12)' : 'none' }}>
              <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, background: d ? '#8FA98F' : 'rgba(124,77,255,.18)', color: d ? '#14241a' : 'var(--v-violet)', border: d ? 'none' : '1px solid rgba(179,136,255,.4)' }}>{d ? '✓' : s.n}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</div>
                <p className="v-lead" style={{ margin: '3px 0 0', fontSize: 13.5 }}>{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      <GuideChat />
    </section>
  );
}

function GuideChat() {
  const [msgs, setMsgs] = useState<{ who: 'guide' | 'you'; text: string }[]>([
    { who: 'guide', text: 'Hi Russell — I’m ClaudIA, your guide for this. Ask me anything about finalizing, or tap a question below.' },
  ]);
  const [input, setInput] = useState('');
  function answer(text: string) {
    const t = text.toLowerCase();
    const hit = GUIDE_FAQ.find((f) => f.keys.some((k) => t.includes(k)));
    return hit ? hit.a : 'I can help with: verifying FBID, signing, the transfers (Exhibit 3), what “Early Co-founder” means, why there’s no lawyer, and what happens after you sign. Tap a question below.';
  }
  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { who: 'you', text: q }, { who: 'guide', text: answer(q) }]);
    setInput('');
  }
  return (
    <div className="v-card v-noprint" style={{ marginTop: 14 }}>
      <div className="v-eyebrow" style={{ color: 'var(--v-violet)' }}>Ask ClaudIA · your guide</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0', maxHeight: 280, overflowY: 'auto' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.who === 'you' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, background: m.who === 'you' ? 'rgba(245,215,122,.16)' : 'rgba(124,77,255,.14)', border: '1px solid rgba(179,136,255,.2)' }}>{m.text}</div>
        ))}
      </div>
      <div className="tech-row">
        {GUIDE_FAQ.map((f) => (
          <button key={f.q} className="chip" style={{ cursor: 'pointer' }} onClick={() => send(f.q)}>{f.q}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" style={{ flex: 1 }} />
        <button className="vbtn vbtn-ghost" type="submit">Send</button>
      </form>
    </div>
  );
}

/* ── FBID verification gate for signers (email → magic link) ── */
function FbidGate({ name }: { name: string }) {
  function go() {
    const cb = `${window.location.origin}/separationagreement/auth/callback`;
    window.location.href = hubRedirect('flowscrow', cb, '/');
  }
  const hint =
    name === 'Estefanía Ferrera' ? 'Yours is your cryptocoatl email.' :
    name === 'Russell Herod' ? 'Yours is your cryptokoh email.' : '';
  return (
    <div className="v-card v-noprint" style={{ borderColor: 'rgba(245,215,122,.45)', marginBottom: 18 }}>
      <div className="v-eyebrow" style={{ color: 'var(--v-gold)' }}>Verify with FBID to sign &amp; download</div>
      <p className="v-lead" style={{ fontSize: 13.5, margin: '6px 0 12px' }}>
        Your code opens the vault to read. To <b style={{ color: 'var(--v-ink)' }}>sign or download</b> as {name},
        log in with your FBID — your email must match you. {hint} You’ll log in at FBID and come straight back here,
        verified, on the signature.
      </p>
      <button className="vbtn vbtn-gold" onClick={go}>Verify with FBID →</button>
    </div>
  );
}

/* ─────────────────────────── the opened vault ─────────────────────────── */
function Reveal({ code, r }: { code: string; r: Resolved }) {
  const [sigs, setSigs] = useState<Signature[]>([]);
  const [wits, setWits] = useState<Witness[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const isSigner = r.kind === 'signer';
  const role = r.party_role;
  const who = r.display_name;
  const canAct = isSigner && authorized; // may sign + download

  useEffect(() => {
    vaultSignatures().then(setSigs).catch(() => {});
    vaultWitnesses().then(setWits).catch(() => {});
    if (isSigner) {
      vaultAuthorized(code).then(setAuthorized).catch(() => {});
      sessionEmail().then(setEmail).catch(() => {});
    }
  }, [code, isSigner]);
  // Once verified (e.g. returning from FBID login), land on the agreement signature.
  useEffect(() => {
    if (isSigner && authorized) {
      const t = setTimeout(() => document.getElementById('sign')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
      return () => clearTimeout(t);
    }
  }, [isSigner, authorized]);
  const refresh = () => { vaultSignatures().then(setSigs).catch(() => {}); };

  const note = r.person_key ? PERSONAL[r.person_key] : null;

  return (
    <div className="reveal enter">
      {note && (
        <div className="v-card" style={{ marginBottom: 18, borderColor: 'rgba(245,215,122,.5)', background: 'rgba(40,22,72,.6)' }}>
          <div className="v-eyebrow" style={{ color: 'var(--v-gold)' }}>A personal note for you</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '6px 0 8px', color: 'var(--v-ink)' }}>{note.title}</h3>
          {note.paras.map((p, i) => <p key={i} className="v-lead" style={{ margin: '0 0 10px' }}>{p}</p>)}
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--v-gold)' }}>— Step by Steph, with love</p>
        </div>
      )}
      {!isSigner && (
        <div className="v-card v-noprint" style={{ marginBottom: 18, borderColor: 'rgba(245,215,122,.4)', textAlign: 'center' }}>
          <b className="gold">Witness · view only</b> — welcome, {who}. You may read and verify these documents.
          Witnesses do not download or sign. Your attendance is recorded on the audit trail.
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="v-eyebrow">Recognition, signed honestly</div>
        <h1 className="v-h1">The work, <span className="v-grad">named to the record.</span></h1>
        <p className="v-lead" style={{ maxWidth: 660, margin: '6px auto 0' }}>
          Welcome, <b style={{ color: 'var(--v-ink)' }}>{who}</b>. This vault holds the Separation Agreement and the
          Acknowledgment of Contribution — recognizing <b style={{ color: 'var(--v-ink)' }}>Russell</b> as an{' '}
          <b className="gold">Early Co-founder</b> of DANZ &amp; FlowB and acknowledging <b style={{ color: 'var(--v-ink)' }}>Deven</b> —
          alongside the real numbers, validated by cryptography and witnessed on the record.
        </p>
        {canAct && email && <p style={{ fontSize: 12.5, color: 'var(--v-gold)', marginTop: 8 }}>✓ FBID verified as {email}</p>}
      </div>

      <div className="v-card v-noprint" style={{ marginBottom: 18, textAlign: 'center', fontSize: 13, color: 'var(--v-dim)' }}>
        📄 This is the <b style={{ color: 'var(--v-ink)' }}>revised agreement (June 26, 2026)</b>. If you opened this earlier,
        refresh the page to load the latest before you review or sign.
      </div>

      {r.person_key === 'russell' && <RussellGuide sigs={sigs} authorized={authorized} />}

      <StandingPanel />

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">1 · The note</div>
        <h2 className="v-h2">We found the honest name: Early Co-founder</h2>
        <div className="v-card" style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--v-ink)', fontWeight: 600, margin: '0 0 10px' }}>Russell,</p>
          {MESSAGE.paragraphs.map((p, i) => <p key={i} className="v-lead" style={{ margin: '0 0 14px' }}>{richText(p)}</p>)}
          <p className="v-lead" style={{ whiteSpace: 'pre-line', margin: 0, color: 'var(--v-ink)' }}>{MESSAGE.signoff}</p>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">2 · The record</div>
        <h2 className="v-h2">Proposed credit vs. what the record shows</h2>
        <div className="v-card" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {RECORD_ROWS.map((r2, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, alignItems: 'start', paddingBottom: 10, borderBottom: i < RECORD_ROWS.length - 1 ? '1px solid rgba(179,136,255,.14)' : 'none' }}>
              <div style={{ color: 'var(--v-magenta)', fontWeight: 600, fontSize: 14 }}>{r2.implies}</div>
              <div className="v-lead" style={{ fontSize: 14 }}>{r2.shows}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="v-eyebrow">3 · The reality</div>
        <h2 className="v-h2">What FlowBond actually is, in numbers</h2>
        <p className="v-lead" style={{ margin: '4px 0 14px' }}>From the live org audit (GitHub org API, 2026-06-24). The same figures any investor sees.</p>
        <div className="stat-grid">
          {REALITY_STATS.map((s, i) => (<div className="stat" key={i}><div className="n">{s.value}</div><div className="l">{s.label}</div><div className="s">{s.sub}</div></div>))}
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
            <div className="tech-row">{RAILS.map((r2) => <span className="chip" key={r2.name} title={r2.what} style={{ borderColor: 'rgba(245,215,122,.35)' }}>{r2.name} · {r2.ready}</span>)}</div>
          </div>
        </div>
      </section>

      <section id="sign">
        <div className="v-eyebrow">5 · The documents</div>
        <h2 className="v-h2">{canAct ? 'Read, download & sign' : isSigner ? 'Read — verify with FBID to sign' : 'Read & verify'}</h2>
        <p className="v-lead" style={{ margin: '4px 0 16px' }}>
          Two documents sit in escrow: the <b style={{ color: 'var(--v-ink)' }}>Separation &amp; Transition Agreement</b> and
          the <b style={{ color: 'var(--v-ink)' }}>Acknowledgment of Contribution</b> (Exhibit 5). Only Estefanía and
          Russell sign — with FBID — and the named witnesses verify.
        </p>

        {isSigner && !authorized && <FbidGate name={who} />}

        <div className="v-eyebrow" style={{ marginBottom: 8 }}>Document 1 — Separation Agreement</div>
        <AgreementPaper role={role} code={code} canAct={canAct} sigs={sigs} wits={wits} onSigned={refresh} />

        <div className="v-eyebrow" style={{ margin: '28px 0 8px' }}>Document 2 — Acknowledgment of Contribution (Exhibit 5)</div>
        <Acknowledgment role={role} code={code} canAct={canAct} sigs={sigs} onSigned={refresh} />
      </section>

      <CommentBox code={code} who={who} />

      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: 'var(--v-dim)' }} className="v-noprint">
        FlowScrow coordinates and records this closing and conditionally releases documents once each task is verified.
        Binding signatures are executed via DocuSign and confirmed by counsel; any on-chain record is a tamper-evident
        timestamp, not a legal signature. This tool does not provide legal advice.
      </p>
    </div>
  );
}

/* ── shared sign + download controls (FBID-verified signers only) ── */
function SignControls({
  role, code, document, sigs, onSigned, buildText, filename, showDocuSign,
}: {
  role: VaultRole; code: string; document: 'agreement' | 'acknowledgment';
  sigs: Signature[]; onSigned: () => void; buildText: () => string; filename: string; showDocuSign?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ds, setDs] = useState<string | null>(null);
  const mySig = sigs.find((s) => s.party_role === role && s.document === document);

  async function sign() {
    setBusy(true); setErr(null);
    try { await vaultSign(code, document); onSigned(); }
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
        <div style={{ color: 'var(--v-gold)', fontWeight: 700 }}>✓ Signed as {mySig.signer_name} · {new Date(mySig.signed_at).toLocaleString()}</div>
      ) : (
        <button className="vbtn vbtn-gold" disabled={busy} onClick={sign}>{busy ? 'Signing…' : `Sign as ${PARTIES[role].short}`}</button>
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

function LockedNote({ signer }: { signer: boolean }) {
  return (
    <div className="v-card v-noprint" style={{ marginTop: 14 }}>
      <span className="pill" style={{ color: 'var(--v-gold)' }}>{signer ? 'verify FBID to sign / download' : 'witness · view only'}</span>
      <p style={{ fontSize: 12.5, color: 'var(--v-dim)', margin: '8px 0 0' }}>
        {signer
          ? 'Verify with FBID above (your login email must match you) to enable signing and download.'
          : 'You are recorded as a witness. Witnesses verify but do not download or sign.'}
      </p>
    </div>
  );
}

/* ── the Separation & Transition Agreement paper ── */
function AgreementPaper({ role, code, canAct, sigs, wits, onSigned }: { role: VaultRole | null; code: string; canAct: boolean; sigs: Signature[]; wits: Witness[]; onSigned: () => void }) {
  const g = AGREEMENT;
  const stephSigned = sigs.find((s) => s.party_role === 'steph' && s.document === 'agreement');
  const russellSigned = sigs.find((s) => s.party_role === 'russell' && s.document === 'agreement');
  const isHeading = (s: string) =>
    /^\d+\.\s/.test(s) || s === 'Recitals' || s.startsWith('Exhibit A') || s.startsWith('IN WITNESS') ||
    ['Domains', 'Payment & Financial Accounts (FlowBond-linked)', 'Repositories', 'Web3, Communication & Social Accounts (FlowBond-linked)', 'Catch-All (Company property only)'].includes(s);
  const buildText = () =>
    [
      g.title.toUpperCase(), g.subtitle, '', `Effective Date: ${g.effective}`, '',
      ...g.body, '',
      'Estefanía Ferrera — ______________________   Date: __________',
      'Russell Herod — ______________________   Date: __________', '',
      'Witnesses (view-only): ' + WITNESSES.join(', '),
      ...sigs.filter((s) => s.document === 'agreement').map((s) => `\n[electronically signed in vault, FBID-verified] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
    ].join('\n');
  const fingerprint = useMemo(() => keccak256(toHex(buildText())), [sigs]);

  return (
    <>
      <div className="doc-paper" style={{ marginTop: 12 }}>
        <h3>{g.title}</h3>
        <div className="meta">{g.subtitle} · Effective {g.effective}</div>
        {g.body.map((line, i) =>
          isHeading(line)
            ? <p key={i} style={{ margin: '16px 0 4px', fontWeight: 700 }}>{line}</p>
            : <p key={i} style={{ margin: '6px 0', fontSize: 14 }}>{line}</p>,
        )}
        <div className="sig-line">
          <span><b>Estefanía Ferrera</b> {stephSigned ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> {russellSigned ? '✓ signed' : '— ____________'}</span>
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
        <div className="v-eyebrow" style={{ color: 'var(--v-gold)' }}>Cryptographic seal</div>
        <p className="v-lead" style={{ fontSize: 13.5, margin: '6px 0 10px' }}>
          This is the seal of the exact agreement text above — objective, tamper-evident proof anyone can verify.
          Change a single character and it changes. Binding execution is via DocuSign under Texas law (Sections 18–19).
        </p>
        <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
          <ProofSeal hash={fingerprint} size={236} sealed={!!stephSigned && !!russellSigned} />
          <div style={{ fontSize: 12.5, color: stephSigned && russellSigned ? 'var(--v-gold)' : 'var(--v-dim)', marginTop: 2 }}>
            {stephSigned && russellSigned ? '✦ Sealed — both parties signed' : 'Your agreement, made visible — a living sigil from its fingerprint. No two are alike.'}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--v-violet)', wordBreak: 'break-all', background: 'rgba(0,0,0,.25)', padding: '10px 12px', borderRadius: 10 }}>keccak256 · {fingerprint}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--v-dim)' }}>
          <span>🔒 Immutable audit trail</span><span>⛓ Anchorable on Base</span><span>🆔 FBID-verified e-signature (ESIGN/UETA)</span><span>👁 Witnessed</span>
        </div>
      </div>

      {canAct && role
        ? <SignControls role={role} code={code} document="agreement" sigs={sigs} onSigned={onSigned} buildText={buildText} filename="Separation-Agreement.txt" showDocuSign />
        : <LockedNote signer={!!role} />}
    </>
  );
}

/* ── the signable Acknowledgment paper ── */
function Acknowledgment({ role, code, canAct, sigs, onSigned }: { role: VaultRole | null; code: string; canAct: boolean; sigs: Signature[]; onSigned: () => void }) {
  const a = ACKNOWLEDGMENT;
  const buildText = () =>
    [
      a.title, '', `Issued by: ${a.issuedBy}`, `In recognition of: ${a.recognitionOf}`, `Role: ${a.role}`,
      `Period: ${a.period.replace(/\*/g, '')}`, '', 'Scope of contribution:',
      ...a.scope.map((s) => ' - ' + s.replace(/\*/g, '')), '',
      'Acknowledgment. ' + a.acknowledgment, '',
      ...a.also.map((x) => `Also recognized — ${x.name} (${x.role.replace(/\*/g, '')}): ${x.text.replace(/\*/g, '')}`),
      '', 'Scope & clarity. ' + a.scopeClarity, '',
      'Acknowledged and agreed:', '', 'Estefanía Ferrera — ______________________   Date: __________', '',
      'Russell Herod — ______________________   Date: __________',
      ...sigs.filter((s) => s.document === 'acknowledgment').map((s) => `\n[signed in vault, FBID-verified] ${s.signer_name} (${s.party_role}) · ${new Date(s.signed_at).toLocaleString()}`),
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
        {a.also.map((x, i) => (
          <div key={i} style={{ borderLeft: '3px solid #8a5cff', paddingLeft: 14, margin: '14px 0' }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700 }}>Also recognized — {x.name} <span style={{ fontWeight: 400, color: '#6b5b8c' }}>({richText(x.role)})</span></p>
            <p style={{ margin: 0, fontSize: 14 }}>{richText(x.text)}</p>
          </div>
        ))}
        <p style={{ fontSize: 13.5, color: '#4a3a6c' }}><b>Scope &amp; clarity.</b> {a.scopeClarity}</p>
        <div className="sig-line">
          <span><b>Estefanía Ferrera</b> {sigs.find((s) => s.party_role === 'steph' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
          <span><b>Russell Herod</b> {sigs.find((s) => s.party_role === 'russell' && s.document === 'acknowledgment') ? '✓ signed' : '— ____________'}</span>
        </div>
      </div>
      {canAct && role
        ? <SignControls role={role} code={code} document="acknowledgment" sigs={sigs} onSigned={onSigned} buildText={buildText} filename="Acknowledgment-of-Contribution.txt" />
        : <LockedNote signer={!!role} />}
    </>
  );
}
