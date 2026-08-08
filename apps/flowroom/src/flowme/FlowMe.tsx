import { useEffect, useRef, useState } from 'react';
import { MARK_COLORS, MARK_LABELS, MARK_ORDER } from '@/lib/marks';

/**
 * FlowMe — the friendly guide.
 *
 * She opens herself the first time someone enters, walks them round the room
 * once, and then gets out of the way. After that she waits in the corner.
 *
 * A deliberate design choice: rather than spotlighting live elements — which
 * only exist at particular scroll positions, or on hover, and which would
 * therefore point at nothing half the time — she *demonstrates* the controls
 * inside her own card. What she shows is the real component with the real
 * colours, so the thing you are told to look for is the thing you then see.
 *
 * She is a guide, not a language model: the answers are written, and each one
 * can take you to the chapter it belongs to. Honest, instant, and it works
 * with no key and no backend.
 */

const SEEN_KEY = 'flowroom.1mwd.flowme.seen';

interface Step {
  title: string;
  body: string;
  demo?: 'marks' | 'comment' | 'share' | 'download';
  point?: 'hud' | 'share' | 'none';
}

const TOUR: Step[] = [
  {
    title: 'Hi — I’m FlowMe.',
    body:
      'This isn’t a PDF. It’s a living room you can talk back to. Give me twenty seconds and I’ll show you where everything is, then I’ll get out of your way.',
    point: 'none',
  },
  {
    title: 'It moves like a film.',
    body:
      'Just scroll. Each chapter arrives, plays its piece, and then holds perfectly still so you can read it. Nothing runs away from you — take as long as you like.',
    point: 'none',
  },
  {
    title: 'You’re never lost.',
    body:
      'The bar at the bottom always tells you which chapter you’re in and how far through you are. Tap any mark on it to jump straight there, and back again.',
    point: 'hud',
  },
  {
    title: 'Answer anything, right where it is.',
    body:
      'Hover any block — or just tap it on your phone — and five little squares appear. That’s how you answer without writing a word. One tap sets it, tapping the same one again clears it.',
    demo: 'marks',
  },
  {
    title: 'Questions go on the thing itself.',
    body:
      'Next to the squares is a ＋. That opens a note attached to that exact block, so a question about week three lives on week three — not in an email three days later where nobody can find it.',
    demo: 'comment',
  },
  {
    title: 'Bring your people in.',
    body:
      'Share the key gives you one link to send your team. You choose what they can do first — read only, comment, or mark things up with you. The vault greets them with your name.',
    demo: 'share',
    point: 'share',
  },
  {
    title: 'Take it all with you.',
    body:
      'At the very end you can download the whole thing as one file for your AI — terms, dates, owners, and everything you marked — or as a PDF for your lawyer. Your assistant can answer questions on it and draft your side of the paperwork.',
    demo: 'download',
  },
  {
    title: 'And then?',
    body:
      'Mark what you agree with, question what you don’t, and we’ll run the follow-up call from exactly that. Nothing needs deciding today — the only genuinely urgent one is the four Dance Hearts rules, because weeks six and seven wait on it.',
    point: 'none',
  },
];

const ASKS: { q: string; a: string; go?: string }[] = [
  {
    q: 'What am I actually agreeing to?',
    a: 'Ten percent of House of Tigris Media, vesting to Steph Ferrera personally, in exchange for building the whole platform. The FlowBond stack is supplied at cost while you’re pre-revenue, and platform fees only begin later — as monetisation switches on and funding lands.',
    go: 'deal',
  },
  {
    q: 'What do you need from me, and when?',
    a: 'Four groups: decisions in week one, access in weeks one and two, legal in weeks two to four, and content and people in weeks four to eight. The developer accounts are handled on our side, so they’re off your list entirely.',
    go: 'need',
  },
  {
    q: 'What already exists versus what gets built?',
    a: 'Identity, split payments, the referral graph, the ledger, the infrastructure and the whole gamified layer at danz.now are running in production today. The honest inventory chapter marks every single system Live, Wire or Later.',
    go: 'inventory',
  },
  {
    q: 'Why does the chain have to be a graph?',
    a: 'Because a counter can’t be defended. A graph lets you see who brought whom, spotlight the woman in Lagos who brought forty thousand, pay a referral share, and prune a poisoned branch without touching an honest one.',
    go: 'chain',
  },
  {
    q: 'How do I know the numbers can’t be gamed?',
    a: 'We already tested it in production on danz.now: a claim for 99,999 points was recorded as 15. The server recomputes from measured time and intensity and never accepts what the browser says.',
    go: 'danz-proof',
  },
  {
    q: 'When does it launch?',
    a: 'Twelve weeks from the seventeenth of August. First cohort onboarding opens in week nine and the public launch lands the first week of November — ahead of any We Speak Dance end-card date you set.',
    go: 'plan',
  },
];

export default function FlowMe({ canMark, canComment }: { canMark: boolean; canComment: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'tour' | 'ask'>('tour');
  const [asked, setAsked] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* First visit: she introduces herself, once. */
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* private browsing — treat as seen so she is never annoying */
    }
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1400);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }, [open]);

  const s = TOUR[step];
  const last = step === TOUR.length - 1;

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop + 2, behavior: 'smooth' });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMode('tour');
          setStep(0);
        }}
        aria-label="Open FlowMe, the guide"
        className="fixed bottom-16 left-4 z-50 flex items-center gap-2.5 px-3 py-2.5 transition-opacity hover:opacity-90 md:bottom-5 md:left-5"
        style={{ background: 'rgb(13 7 22 / 0.9)', border: '1px solid var(--hair)' }}
      >
        <Orb />
        <span className="t-tag" style={{ color: 'var(--gold)' }}>
          FlowMe
        </span>
      </button>
    );
  }

  return (
    <div
      ref={cardRef}
      className="fm-card fixed bottom-16 left-4 z-50 md:bottom-5 md:left-5"
      style={{
        width: 'min(24rem, calc(100vw - 2rem))',
        background: 'rgb(13 7 22 / 0.97)',
        border: '1px solid var(--hair)',
        borderTop: '4px solid var(--gold)',
        boxShadow: '0 26px 80px rgb(0 0 0 / 0.65)',
        backdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-label="FlowMe guide"
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <span className="flex items-center gap-2.5">
          <Orb />
          <span className="t-tag" style={{ color: 'var(--gold)' }}>
            FlowMe
          </span>
        </span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'tour' ? 'ask' : 'tour');
              setAsked(null);
              setStep(0);
            }}
            className="t-mono text-white/60 transition-colors hover:text-white"
          >
            {mode === 'tour' ? 'Ask me' : 'Show me'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="t-mono text-white/60 transition-colors hover:text-white"
            aria-label="Close FlowMe"
          >
            ✕
          </button>
        </span>
      </div>

      <div className="max-h-[62svh] overflow-y-auto px-5 pb-5" data-scrollable>
        {mode === 'tour' ? (
          <>
            <h3 className="t-sub mb-2 text-[1.3rem] text-white" data-fm>
              {s.title}
            </h3>
            <p
              className="mb-4 text-[0.92rem] leading-relaxed text-white/85"
              data-fm
            >
              {s.body}
            </p>

            {s.demo === 'marks' && <MarksDemo />}
            {s.demo === 'comment' && <CommentDemo />}
            {s.demo === 'share' && <ShareDemo />}
            {s.demo === 'download' && <DownloadDemo />}

            {!canMark && s.demo === 'marks' && (
              <p className="t-mono mt-2 leading-relaxed" style={{ color: 'var(--azure)' }} data-fm>
                You’re here as a viewer, so these are hidden for you.
              </p>
            )}
            {!canComment && s.demo === 'comment' && (
              <p className="t-mono mt-2 leading-relaxed" style={{ color: 'var(--azure)' }} data-fm>
                You’re here as a viewer, so notes are hidden for you.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3" data-fm>
              <span className="flex flex-1 items-center gap-1">
                {TOUR.map((_, i) => (
                  <span
                    key={i}
                    className="h-[3px] flex-1 transition-colors duration-200"
                    style={{ background: i <= step ? 'var(--gold)' : 'rgb(255 255 255 / 0.2)' }}
                  />
                ))}
              </span>
              <span className="t-mono shrink-0 text-white/55">
                {step + 1}/{TOUR.length}
              </span>
            </div>

            <div className="mt-4 flex gap-2" data-fm>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((n) => n - 1)}
                  className="t-tag px-4 py-2.5 transition-colors"
                  style={{ border: '1px solid var(--hair)', color: '#fff' }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (last) setOpen(false);
                  else {
                    if (s.point === 'hud') {
                      /* nothing to scroll — the HUD is always on screen */
                    }
                    setStep((n) => n + 1);
                  }
                }}
                className="t-tag flex-1 px-4 py-2.5 transition-opacity hover:opacity-90"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                {last ? 'Got it — let me read' : 'Next'}
              </button>
            </div>

            {!last && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="t-mono mt-3 w-full text-center text-white/45 transition-colors hover:text-white/80"
              >
                skip
              </button>
            )}
          </>
        ) : (
          <>
            {asked === null ? (
              <>
                <p className="mb-3 text-[0.92rem] leading-relaxed text-white/85" data-fm>
                  Pick one and I’ll answer it, then take you to the part of the flow it comes from.
                </p>
                <ul className="space-y-1.5">
                  {ASKS.map((a, i) => (
                    <li key={a.q} data-fm>
                      <button
                        type="button"
                        onClick={() => setAsked(i)}
                        className="block w-full px-3.5 py-2.5 text-left text-[0.88rem] leading-snug text-white/90 transition-colors hover:bg-white/5"
                        style={{ border: '1px solid var(--hair)' }}
                      >
                        {a.q}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="t-mono mt-4 leading-relaxed text-white/45" data-fm>
                  Anything else — leave it as a note on the block it belongs to and Steph will answer
                  it there.
                </p>
              </>
            ) : (
              <>
                <h3 className="t-sub mb-2 text-[1.15rem] text-white" data-fm>
                  {ASKS[asked].q}
                </h3>
                <p className="mb-4 text-[0.92rem] leading-relaxed text-white/85" data-fm>
                  {ASKS[asked].a}
                </p>
                <div className="flex gap-2" data-fm>
                  <button
                    type="button"
                    onClick={() => setAsked(null)}
                    className="t-tag px-4 py-2.5 transition-colors"
                    style={{ border: '1px solid var(--hair)', color: '#fff' }}
                  >
                    Back
                  </button>
                  {ASKS[asked].go && (
                    <button
                      type="button"
                      onClick={() => {
                        jump(ASKS[asked].go!);
                        setOpen(false);
                      }}
                      className="t-tag flex-1 px-4 py-2.5 transition-opacity hover:opacity-90"
                      style={{ background: 'var(--gold)', color: 'var(--ink)' }}
                    >
                      Take me there →
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* She is made of the same heart-network the room opens with.          */
/* ------------------------------------------------------------------ */

function Orb() {
  return (
    <span className="relative block h-6 w-6 shrink-0" aria-hidden="true">
      <span
        className="fm-pulse absolute inset-0 rounded-full"
        style={{ background: 'var(--gold)' }}
      />
      <svg viewBox="0 0 24 24" className="relative h-6 w-6">
        <path
          d="M12 20.5C6.5 16.8 3.5 13.7 3.5 10.2A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 8.5 2.2c0 3.5-3 6.6-8.5 10.3Z"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.3"
        />
        {[
          [12, 8],
          [7.4, 10.4],
          [16.6, 10.4],
          [12, 14.2],
          [9.4, 16.4],
          [14.6, 16.4],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 0 ? 1.5 : 0.95} fill="var(--gold-hi)" />
        ))}
      </svg>
    </span>
  );
}

/* ---- Demonstrations: the real controls, at real size ---- */

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div data-fm>
      <div
        className="flex items-center justify-center gap-2 px-3 py-3"
        style={{ background: 'rgb(0 0 0 / 0.4)', border: '1px solid var(--hair)' }}
      >
        {children}
      </div>
      <p className="t-mono mt-1.5 text-white/45">{label}</p>
    </div>
  );
}

function MarksDemo() {
  return (
    <Frame label="this is what appears on every block">
      <span className="flex items-stretch" style={{ background: 'var(--ink)', border: '1px solid var(--hair)' }}>
        {MARK_ORDER.map((m, i) => (
          <span key={m} className="grid h-7 w-7 place-items-center" title={MARK_LABELS[m]}>
            <span
              className="block"
              style={{
                width: i === 0 ? 15 : 9,
                height: i === 0 ? 15 : 9,
                background: i === 0 ? MARK_COLORS[m] : 'transparent',
                border: `2px solid ${MARK_COLORS[m]}`,
                opacity: i === 0 ? 1 : 0.62,
              }}
            />
          </span>
        ))}
        <span
          className="t-mono grid h-7 min-w-7 place-items-center border-l px-2 text-white/60"
          style={{ borderColor: 'var(--hair)' }}
        >
          ＋
        </span>
      </span>
    </Frame>
  );
}

function CommentDemo() {
  return (
    <div data-fm>
      <ul className="space-y-1">
        {MARK_ORDER.map((m) => (
          <li key={m} className="flex items-center gap-2.5 text-[0.84rem] text-white/85">
            <span
              className="block shrink-0"
              style={{ width: 11, height: 11, background: MARK_COLORS[m] }}
            />
            {MARK_LABELS[m]}
          </li>
        ))}
      </ul>
      <p className="t-mono mt-2.5 text-white/45">＋ opens a note on that block</p>
    </div>
  );
}

function ShareDemo() {
  return (
    <Frame label="bottom right of your screen">
      <span className="t-tag px-4 py-2" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
        ⚷ Share the key
      </span>
    </Frame>
  );
}

function DownloadDemo() {
  return (
    <Frame label="the last chapter">
      <span className="t-tag px-3 py-2" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
        ↓ For your AI
      </span>
      <span
        className="t-tag px-3 py-2"
        style={{ border: '1px solid var(--gold)', color: 'var(--gold)' }}
      >
        ↓ PDF
      </span>
    </Frame>
  );
}
