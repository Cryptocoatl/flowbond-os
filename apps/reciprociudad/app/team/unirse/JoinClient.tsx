'use client';

import { useCallback, useEffect, useState } from 'react';
import { saniClient, saniConfigured } from '@/lib/sani/client';

/* Areas of participation → drive the suggested role + feature grants. */
const AREAS: { key: string; label: string; features: string[] }[] = [
  { key: 'operacion', label: 'Operación de templos', features: [] },
  { key: 'recoleccion', label: 'Recolección de cubetas', features: ['logistics'] },
  { key: 'ventas', label: 'Ventas / eventos', features: ['bookings'] },
  { key: 'mantenimiento', label: 'Mantenimiento', features: [] },
  { key: 'comunidad', label: 'Comunidad / comunicación', features: [] },
  { key: 'coordinacion', label: 'Coordinación / admin', features: ['bookings', 'logistics', 'audit'] },
];
const AVAILABILITY: { key: string; label: string }[] = [
  { key: 'por_evento', label: 'Por evento' },
  { key: 'fines_de_semana', label: 'Fines de semana' },
  { key: 'entre_semana', label: 'Entre semana' },
  { key: 'tiempo_completo', label: 'Tiempo completo' },
];
const HUB = process.env.NEXT_PUBLIC_FBID_URL || 'https://fbid.flowbond.life';

type Phase = 'loading' | 'login' | 'form' | 'done' | 'active';

export default function JoinClient() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState({
    name: '', phone: '', city: '', availability: 'por_evento',
    vehicle: '', license: '', experience: '', motivation: '',
  });
  const [areas, setAreas] = useState<string[]>([]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggleArea = (k: string) => setAreas((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const loadMe = useCallback(async () => {
    const { data } = await saniClient().rpc('me');
    const me = data as { member: { name: string | null; status: string } | null } | null;
    if (me?.member) {
      // prefill name; if already active they're in the team
      setF((p) => ({ ...p, name: me.member!.name ?? p.name }));
      if (me.member.status === 'active') { setPhase('active'); return; }
    }
    setPhase('form');
  }, []);

  useEffect(() => {
    if (!saniConfigured) { setPhase('login'); return; }
    saniClient().auth.getSession().then(({ data }) => {
      if (data.session) loadMe(); else setPhase('login');
    });
  }, [loadMe]);

  function goHub() {
    const cb = `${window.location.origin}/auth/callback?next=/team/unirse`;
    window.location.assign(`${HUB}/?app=reciprociudad&redirect=${encodeURIComponent(cb)}`);
  }

  function suggestion() {
    const feats = new Set<string>();
    areas.forEach((a) => AREAS.find((x) => x.key === a)?.features.forEach((ff) => feats.add(ff)));
    const role = areas.includes('coordinacion') ? 'admin' : 'member';
    return { role, features: [...feats] };
  }

  async function submit() {
    if (!f.name.trim()) { setErr('Escribe tu nombre.'); return; }
    if (areas.length === 0) { setErr('Elige al menos un área.'); return; }
    setErr(''); setBusy(true);
    const { role, features } = suggestion();
    const profile = {
      name: f.name.trim(), phone: f.phone.trim(), city: f.city.trim(),
      areas, availability: f.availability,
      vehicle: f.vehicle, license: f.license,
      experience: f.experience.trim(), motivation: f.motivation.trim(),
    };
    const { error } = await saniClient().rpc('apply_to_team', {
      p_profile: profile, p_suggested_role: role, p_suggested_features: features,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setStatus('sent'); setPhase('done');
  }

  const wantsVehicle = areas.includes('recoleccion');

  return (
    <div className="sj-root">
      <style>{CSS}</style>
      <div className="sj-wrap">
        <div className="sj-mark">⚱</div>
        <div className="sj-wordmark">SANI TEMPLO</div>

        {phase === 'loading' && <p className="sj-muted" style={{ textAlign: 'center' }}>Cargando…</p>}

        {phase === 'login' && (
          <div className="sj-card">
            <div className="sj-eyebrow">Únete al equipo</div>
            <h1 className="sj-h1">Crea tu perfil</h1>
            <p className="sj-muted" style={{ marginTop: 8 }}>
              Primero entra con tu <strong>FlowBond ID</strong> — una identidad segura para todo el ecosistema.
              Luego llenas un cuestionario corto y un coordinador te asigna tu rol.
            </p>
            {!saniConfigured
              ? <p className="sj-muted" style={{ marginTop: 14 }}>Onboarding no configurado (falta la llave de Supabase).</p>
              : <button className="sj-btn gold" onClick={goHub} style={{ marginTop: 18, width: '100%' }}>Entrar con FlowBond ID</button>}
          </div>
        )}

        {phase === 'active' && (
          <div className="sj-card">
            <div className="sj-check">✓</div>
            <h1 className="sj-h1">Ya eres del equipo</h1>
            <p className="sj-muted" style={{ marginTop: 8 }}>Tu cuenta ya está activa.</p>
            <a className="sj-btn gold" href="/team" style={{ marginTop: 16, display: 'inline-block' }}>Ir a la consola</a>
          </div>
        )}

        {phase === 'done' && (
          <div className="sj-card">
            <div className="sj-check">✓</div>
            <h1 className="sj-h1">¡Solicitud enviada!</h1>
            <p className="sj-muted" style={{ marginTop: 8 }}>
              Gracias, {f.name.split(' ')[0] || 'crack'}. Un coordinador revisará tu perfil y activará tus accesos.
              Te avisaremos por tu correo de FlowBond ID.
            </p>
            <button className="sj-btn ghost" onClick={() => setPhase('form')} style={{ marginTop: 16 }}>Editar mi perfil</button>
          </div>
        )}

        {phase === 'form' && (
          <div className="sj-card">
            <div className="sj-eyebrow">Cuestionario</div>
            <h1 className="sj-h1">Cuéntanos de ti</h1>

            <div className="sj-grid2" style={{ marginTop: 16 }}>
              <Field label="Nombre completo *"><input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="WhatsApp / teléfono"><input value={f.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} /></Field>
            </div>
            <Field label="Ciudad / zona"><input value={f.city} placeholder="p.ej. CDMX, Roma-Condesa" onChange={(e) => set('city', e.target.value)} /></Field>

            <div className="sj-block">
              <label>¿En qué áreas quieres participar? *</label>
              <div className="sj-chips">
                {AREAS.map((a) => (
                  <button key={a.key} type="button" className={`sj-chip ${areas.includes(a.key) ? 'on' : ''}`} onClick={() => toggleArea(a.key)}>
                    {areas.includes(a.key) ? '✓ ' : ''}{a.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Disponibilidad">
              <select value={f.availability} onChange={(e) => set('availability', e.target.value)}>
                {AVAILABILITY.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>

            {wantsVehicle && (
              <div className="sj-grid2">
                <div className="sj-block">
                  <label>¿Tienes vehículo? (para recolección)</label>
                  <div className="sj-chips">
                    {['Sí', 'No'].map((v) => (
                      <button key={v} type="button" className={`sj-chip ${f.vehicle === v ? 'on' : ''}`} onClick={() => set('vehicle', v)}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="sj-block">
                  <label>¿Licencia de conducir?</label>
                  <div className="sj-chips">
                    {['Sí', 'No'].map((v) => (
                      <button key={v} type="button" className={`sj-chip ${f.license === v ? 'on' : ''}`} onClick={() => set('license', v)}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Field label="Experiencia relevante"><textarea rows={2} value={f.experience} onChange={(e) => set('experience', e.target.value)} /></Field>
            <Field label="¿Por qué quieres unirte?"><textarea rows={2} value={f.motivation} onChange={(e) => set('motivation', e.target.value)} /></Field>

            {err && <p className="sj-err">{err}</p>}
            <button className="sj-btn gold" disabled={busy} onClick={submit} style={{ marginTop: 16, width: '100%' }}>
              {busy ? 'Enviando…' : 'Enviar mi perfil'}
            </button>
            <p className="sj-muted" style={{ marginTop: 10, fontSize: 12 }}>
              Tu rol y accesos los confirma un coordinador. Esto es solo tu propuesta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="sj-block"><label>{label}</label>{children}</div>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Jost:wght@300;400;500&display=swap');
.sj-root{--gold:#cfa85a;--gold-dp:#b2893a;--gold-line:rgba(207,168,90,.28);--cream:#f4ecdb;--mut:#b6a888;
  position:fixed;inset:0;overflow:auto;background:radial-gradient(120% 90% at 50% -10%,#2a2016,#120d08 55%,#0c0906);
  color:var(--cream);font-family:'Jost',system-ui,sans-serif;font-weight:300;z-index:0}
.sj-root *{box-sizing:border-box}
.sj-wrap{max-width:560px;margin:0 auto;padding:38px 20px 80px}
.sj-mark{font-size:40px;color:var(--gold);text-align:center}
.sj-wordmark{font-family:'Cinzel',serif;letter-spacing:.34em;color:#f6eeda;font-weight:600;font-size:17px;text-align:center;margin-top:2px}
.sj-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
.sj-h1{font-family:'Cinzel',serif;font-size:clamp(22px,4vw,30px);color:#f6eeda;font-weight:500;margin-top:6px}
.sj-muted{color:var(--mut)}
.sj-card{background:linear-gradient(180deg,#1c1710,#15110b);border:1px solid var(--gold-line);border-radius:14px;padding:24px;margin-top:22px}
.sj-block{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.sj-block>label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.sj-block input,.sj-block select,.sj-block textarea{background:rgba(8,6,4,.6);border:1px solid var(--gold-line);border-radius:8px;color:var(--cream);padding:11px 12px;font-family:inherit;font-size:14px;outline:none;width:100%}
.sj-block input:focus,.sj-block select:focus,.sj-block textarea:focus{border-color:var(--gold)}
.sj-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sj-chips{display:flex;gap:8px;flex-wrap:wrap}
.sj-chip{font-size:13px;padding:8px 14px;border-radius:22px;border:1px solid var(--gold-line);background:transparent;color:var(--mut);cursor:pointer;font-family:inherit}
.sj-chip.on{background:rgba(207,168,90,.16);color:var(--gold);border-color:var(--gold)}
.sj-btn{font-family:inherit;font-size:14px;letter-spacing:.04em;padding:13px 22px;border-radius:7px;cursor:pointer;border:1px solid transparent;transition:.18s;color:inherit;text-decoration:none}
.sj-btn.gold{background:linear-gradient(180deg,var(--gold),var(--gold-dp));color:#1a140a;font-weight:500}
.sj-btn.gold:hover{transform:translateY(-1px)}.sj-btn:disabled{opacity:.55;cursor:default;transform:none}
.sj-btn.ghost{background:transparent;border-color:var(--gold-line);color:var(--cream)}
.sj-check{width:48px;height:48px;border-radius:50%;background:rgba(127,174,94,.12);border:1px solid rgba(127,174,94,.4);color:#cfe6b8;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:4px}
.sj-err{color:#ffc7bf;font-size:13px;margin-top:12px}
@media(max-width:520px){.sj-grid2{grid-template-columns:1fr}}
`;
