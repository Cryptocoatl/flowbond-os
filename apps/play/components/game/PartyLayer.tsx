'use client';
// =============================================================================
// PartyLayer — the whole co-op UI, in one drop-in layer.
//
// Designed for a 7-year-old on an iPad first: one big button to play with
// someone, a four-letter code you can read out loud, a single tap to talk, and
// emoji for when talking isn't happening. Everything else stays out of the way.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { makeCode, normalizeCode } from '@/lib/net/protocol';
import { party as partyRt, BOND_RADIUS } from './runtime';
import type { Party } from './useParty';

const EMOTES = ['👋', '❤️', '⭐', '😂', '👍', '🆘'];

const T = {
  es: {
    play: 'Jugar juntos',
    title: 'Jugar juntos',
    lead: 'Entren a la misma sala y estarán en el mismo mundo, con voz y misiones compartidas.',
    yourName: 'Tu nombre',
    create: 'Crear sala',
    codeLabel: 'Código de la sala',
    joinWith: 'Entrar',
    share: 'Dile este código a la otra persona',
    inRoom: 'En la sala',
    alone: 'Todavía nadie más. Comparte el código.',
    leave: 'Salir de la sala',
    mic: 'Hablar',
    micOn: 'Micrófono encendido',
    micOff: 'Micrófono apagado',
    micDenied: 'El navegador no dio permiso del micrófono',
    micUnsupported: 'Este navegador no soporta la llamada',
    micAsking: 'Pidiendo permiso…',
    connecting: 'Conectando…',
    error: 'Sin conexión con la sala',
    close: 'Listo',
    away: 'lejos',
    bonded: '¡Juntos!',
    hint: 'Acérquense para formar el vínculo',
    copy: 'Copiar invitación',
    copied: '¡Copiado!',
  },
  en: {
    play: 'Play together',
    title: 'Play together',
    lead: 'Join the same room and you are in the same world, with voice and shared missions.',
    yourName: 'Your name',
    create: 'Create room',
    codeLabel: 'Room code',
    joinWith: 'Join',
    share: 'Read this code to the other player',
    inRoom: 'In the room',
    alone: 'Nobody else yet. Share the code.',
    leave: 'Leave room',
    mic: 'Talk',
    micOn: 'Microphone on',
    micOff: 'Microphone off',
    micDenied: 'The browser denied microphone access',
    micUnsupported: 'This browser cannot do the call',
    micAsking: 'Asking permission…',
    connecting: 'Connecting…',
    error: 'No connection to the room',
    close: 'Done',
    away: 'away',
    bonded: 'Together!',
    hint: 'Get closer to form the bond',
    copy: 'Copy invite',
    copied: 'Copied!',
  },
};

/** Live distance to your teammate — rAF-driven so it never re-renders the HUD. */
function BondMeter({ lang, color }: { lang: 'es' | 'en'; color: string }) {
  const label = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const t = T[lang];

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (label.current) {
        const d = partyRt.near;
        label.current.textContent = partyRt.bonded
          ? `🔗 ${t.bonded}`
          : Number.isFinite(d)
            ? `${Math.round(d)} m ${t.away}`
            : '…';
      }
      if (dot.current) dot.current.style.background = partyRt.bonded ? color : 'rgba(255,255,255,.25)';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t, color]);

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-kai-muted">
      <span ref={dot} className="inline-block h-1.5 w-1.5 rounded-full transition-colors" />
      <span ref={label}>…</span>
    </span>
  );
}

export function PartyLayer({
  party,
  lang,
  avatarUrl,
  worldId,
  missionIdx,
  color,
  open,
  onOpenChange,
}: {
  party: Party;
  lang: 'es' | 'en';
  avatarUrl: string;
  worldId: string;
  missionIdx: number;
  color: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = T[lang];
  const [nameDraft, setNameDraft] = useState('');
  const [codeDraft, setCodeDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<{ e: string; who: string; n: number } | null>(null);

  useEffect(() => setNameDraft(party.name), [party.name]);
  useEffect(() => setCodeDraft(party.code), [party.code]);

  // Bounce an incoming emoji in the middle of the screen for a beat.
  useEffect(() => {
    if (!party.lastEmote) return;
    const who = party.members.find((m) => m.id === party.lastEmote?.id)?.name ?? '';
    setFlash({ e: party.lastEmote.e, who, n: party.lastEmote.n });
    const id = window.setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(id);
  }, [party.lastEmote, party.members]);

  const live = party.status === 'live';
  const micLabel =
    party.voice === 'on' ? t.micOn : party.voice === 'asking' ? t.micAsking : party.voice === 'denied' ? t.micDenied : party.voice === 'unsupported' ? t.micUnsupported : t.micOff;

  const doJoin = (code: string) => {
    const c = normalizeCode(code);
    if (!c) return;
    party.join(c, nameDraft || (lang === 'es' ? 'Guardián' : 'Guardian'), avatarUrl, worldId, missionIdx);
  };

  // The invite is deliberately zero-tap on the other end: the code is in the
  // link, so whoever opens it lands in the room without meeting a form.
  const invite = typeof window !== 'undefined' ? `${window.location.origin}/play?sala=${party.code}` : '';

  return (
    <>
      {/* ---- compact party pill (always visible while in a room) ---- */}
      {party.status !== 'off' && (
        <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md">
          <button onClick={() => onOpenChange(true)} className="flex items-center gap-1.5 text-sm text-kai-text">
            <span>👥</span>
            <span className="font-medium">{party.code}</span>
          </button>
          {live ? (
            party.members.length > 0 ? (
              <>
                <span className="h-4 w-px bg-white/15" />
                <span className="max-w-[9rem] truncate text-[12px] text-kai-text">
                  {party.members.map((m) => m.name).join(', ')}
                </span>
                <BondMeter lang={lang} color={color} />
              </>
            ) : (
              <span className="text-[11px] text-kai-faint">{t.alone}</span>
            )
          ) : (
            <span className="text-[11px] text-kai-gold">{party.status === 'error' ? t.error : t.connecting}</span>
          )}
          <button
            onClick={party.toggleMic}
            title={micLabel}
            aria-label={micLabel}
            className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
              party.voice === 'on' ? 'border-kai-jade/60 bg-kai-jade/25 text-kai-jade' : 'border-white/15 bg-black/40 text-kai-text'
            }`}
          >
            {party.voice === 'on' ? '🎙️' : party.voice === 'asking' ? '⏳' : '🔇'}
          </button>
        </div>
      )}

      {/* ---- emotes: talking without talking ---- */}
      {live && (
        <div className="pointer-events-auto absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          {EMOTES.map((e) => (
            <button
              key={e}
              onClick={() => party.sendEmote(e)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/40 text-lg backdrop-blur-md active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {flash && (
        <div key={flash.n} className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 animate-fade-up text-center">
          <div className="text-6xl drop-shadow-lg">{flash.e}</div>
          {flash.who && <div className="mt-1 text-sm text-kai-text">{flash.who}</div>}
        </div>
      )}

      {/* ---- the bond hint ----
           Sits under the party pill, not at the bottom of the screen: the build
           palette lives down there and was covering it. */}
      {live && party.members.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/35 px-3 py-1 text-center text-[11px] text-kai-faint backdrop-blur-sm">
          {t.hint} ({BOND_RADIUS} m)
        </div>
      )}

      {/* ---- the panel ---- */}
      {open && (
        <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md animate-fade-up p-6">
            <div className="text-center">
              <div className="text-3xl">👥</div>
              <h2 className="mt-1 font-display text-xl font-semibold text-kai-text">{t.title}</h2>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-kai-muted">{t.lead}</p>
            </div>

            <label className="mt-5 block text-[11px] uppercase tracking-widest text-kai-faint">{t.yourName}</label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value.slice(0, 16))}
              placeholder={lang === 'es' ? 'Kai' : 'Kai'}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base text-kai-text outline-none focus:border-kai-gold/50"
            />

            {!live ? (
              <>
                <label className="mt-4 block text-[11px] uppercase tracking-widest text-kai-faint">{t.codeLabel}</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value.toUpperCase().slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && doJoin(codeDraft)}
                    placeholder="ABCD"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-center font-mono text-2xl tracking-[0.4em] text-kai-text outline-none focus:border-kai-gold/50"
                  />
                  <button
                    onClick={() => doJoin(codeDraft)}
                    disabled={!normalizeCode(codeDraft)}
                    className="shrink-0 rounded-xl bg-kai-gold px-5 text-sm font-semibold text-black disabled:opacity-40"
                  >
                    {t.joinWith}
                  </button>
                </div>
                <button
                  onClick={() => {
                    const c = makeCode();
                    setCodeDraft(c);
                    doJoin(c);
                  }}
                  className="mt-3 w-full rounded-xl border border-kai-jade/40 bg-kai-jade/15 py-3 text-sm font-semibold text-kai-jade"
                >
                  ✨ {t.create}
                </button>
                {party.status === 'error' && <div className="mt-3 text-center text-[12px] text-kai-gold">{t.error}</div>}
                {party.status === 'connecting' && <div className="mt-3 text-center text-[12px] text-kai-muted">{t.connecting}</div>}
              </>
            ) : (
              <>
                <div className="mt-5 rounded-2xl border border-kai-gold/30 bg-kai-gold/10 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-widest text-kai-faint">{t.share}</div>
                  <div className="mt-1 font-mono text-4xl font-bold tracking-[0.35em] text-kai-gold">{party.code}</div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invite);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1800);
                      } catch {
                        /* clipboard blocked — the code above is still readable */
                      }
                    }}
                    className="mt-3 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-[12px] text-kai-text"
                  >
                    {copied ? `✅ ${t.copied}` : `🔗 ${t.copy}`}
                  </button>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-widest text-kai-faint">{t.inRoom}</div>
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-kai-text">
                      <span>🧍</span>
                      <span className="font-medium">{party.name}</span>
                      <span className="text-[11px] text-kai-faint">({lang === 'es' ? 'tú' : 'you'})</span>
                      <span className="ml-auto">{party.voice === 'on' ? '🎙️' : '🔇'}</span>
                    </div>
                    {party.members.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-[12px] text-kai-faint">{t.alone}</div>
                    ) : (
                      party.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-kai-text">
                          <span>🧍</span>
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-auto">{m.voice ? '🎙️' : '🔇'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={party.toggleMic}
                  className={`mt-4 w-full rounded-xl border py-3 text-sm font-semibold ${
                    party.voice === 'on' ? 'border-kai-jade/50 bg-kai-jade/20 text-kai-jade' : 'border-white/15 bg-black/40 text-kai-text'
                  }`}
                >
                  {party.voice === 'on' ? `🎙️ ${t.micOn}` : `🔇 ${t.mic}`}
                </button>
                {(party.voice === 'denied' || party.voice === 'unsupported') && (
                  <div className="mt-2 text-center text-[12px] text-kai-gold">{micLabel}</div>
                )}

                <button onClick={party.leave} className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-[13px] text-kai-muted">
                  {t.leave}
                </button>
              </>
            )}

            <button onClick={() => onOpenChange(false)} className="mt-4 w-full rounded-full bg-white/10 py-2.5 text-sm font-medium text-kai-text">
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
