'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { OctagonSeal, LivingField } from '@flowbond/ui'
import steph from '../../public/steph_portrait.jpg'

const TOTAL = 14
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * FlowBond investor deck — ported 1:1 from deck.html. 14 slides with keyboard
 * (← → space / PageUp-Down / Home / End), touch-swipe, progress bar, and slide
 * counter. Background flow-field and cover seal reuse @flowbond/ui. The print
 * stylesheet (globals.css) flattens all slides one-per-page for PDF export.
 */
export function Deck() {
  const [i, setI] = useState(0)
  const iRef = useRef(0)
  iRef.current = i

  const go = useCallback((n: number) => setI(Math.max(0, Math.min(TOTAL - 1, n))), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(iRef.current + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(iRef.current - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(TOTAL - 1)
    }
    let sx = 0
    const onTouchStart = (e: TouchEvent) => (sx = e.touches[0].clientX)
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      if (Math.abs(dx) > 50) go(dx < 0 ? iRef.current + 1 : iRef.current - 1)
    }
    addEventListener('keydown', onKey)
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      removeEventListener('keydown', onKey)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchend', onTouchEnd)
    }
  }, [go])

  const sc = (n: number, extra = '') => `slide${extra ? ' ' + extra : ''}${i === n ? ' active' : ''}`

  return (
    <>
      <LivingField />
      <div className="atmos" aria-hidden="true"></div>
      <div className="vign" aria-hidden="true"></div>
      <div className="progress" style={{ width: `${((i + 1) / TOTAL) * 100}%` }}></div>
      <div className="hint">← → / space · navigate</div>

      <div className="stage">
        {/* 01 — Cover */}
        <section className={sc(0, 'cover')}>
          <div className="seal" aria-hidden="true">
            <OctagonSeal />
          </div>
          <div className="kicker" style={{ justifyContent: 'center' }}>
            The Layer 0 of Life
          </div>
          <h1>
            <span className="imagine">If you can imagine&nbsp;it,</span>
            <br />
            <span className="program">
              you can <span className="k">program</span> it<span className="k">.</span>
            </span>
          </h1>
          <p className="credit">
            a phrase by <b>V. Creativo</b> ✦
          </p>
          <p className="sub">FlowBond · Investor Deck · 2026</p>
        </section>

        {/* 02 — The Problem */}
        <section className={sc(1)}>
          <div className="kicker">The Problem</div>
          <h2>
            The internet learned to <span className="v">extract</span>.
          </h2>
          <p className="big">
            Identity is rented from platforms. Value is captured by middlemen. Intelligence is pointed at our attention, not our
            flourishing. Every builder rebuilds the same broken plumbing — auth, wallets, trust — and users pay for it with their data
            and their autonomy. <b>The stack itself is extractive.</b>
          </p>
        </section>

        {/* 03 — The Insight */}
        <section className={sc(2)}>
          <div className="kicker">The Insight</div>
          <h2>
            So we <em>invert the stack</em>.
          </h2>
          <p className="big">
            What if identity were sovereign by default, value compounded when life flourished, and intelligence served stewardship
            instead of surveillance? <b>That isn&apos;t a feature — it&apos;s a foundation.</b> A Layer 0 every app can stand on, where
            regeneration is the default behavior of the system, not an afterthought.
          </p>
        </section>

        {/* 04 — What FlowBond Is */}
        <section className={sc(3)}>
          <div className="kicker">What FlowBond Is</div>
          <h2>
            The <span className="g">Layer 0</span> of Life.
          </h2>
          <p className="big">
            FlowBond is B2B infrastructure: <b>sovereign identity, native value, and FlowMe OS intelligence</b> in one layer beneath
            consumer apps. Builders connect once; their users inherit a complete identity stack — and only ever see the builder&apos;s
            brand. <b>Invisible infrastructure, visible regeneration.</b>
          </p>
        </section>

        {/* 05 — Three Forces */}
        <section className={sc(4)}>
          <div className="kicker">The System · Three Forces</div>
          <h2>One layer. Three forces.</h2>
          <div className="cols">
            <div className="col a">
              <div className="ic">01 · Intelligence</div>
              <h3>AI, woven in</h3>
              <p>FlowMe OS — Claude-grade reasoning inside the identity layer. Every app ships with a mind.</p>
            </div>
            <div className="col b">
              <div className="ic">02 · Value</div>
              <h3>Trust, native</h3>
              <p>Embedded wallets, attestations, proof-of-presence. On-chain where it matters, private by design.</p>
            </div>
            <div className="col c">
              <div className="ic">03 · Life</div>
              <h3>RVBL</h3>
              <p>Real Value Based on Life — value anchored to regeneration, not speculation.</p>
            </div>
          </div>
        </section>

        {/* 06 — FlowMe OS */}
        <section className={sc(5)}>
          <div className="two">
            <div>
              <div className="kicker">FlowMe OS</div>
              <h2>
                The OS that <span className="v">thinks with you.</span>
              </h2>
              <p className="big">
                Agentic intelligence woven through the stack — so products <b>act</b>, not just store.
              </p>
            </div>
            <div className="bullets">
              <div>
                <span className="tag">REASON</span>
                <p>
                  <b>Structured intelligence.</b> Turn missions, check-ins, and content into decisions and on-chain actions.
                </p>
              </div>
              <div>
                <span className="tag">SEE</span>
                <p>
                  <b>Vision built in.</b> Reads the real world — from garden health to product imagery — and responds.
                </p>
              </div>
              <div>
                <span className="tag">ACT</span>
                <p>
                  <b>Agentic by default.</b> Assistants and workflows across every connected app, on one identity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 07 — RVBL */}
        <section className={sc(6)}>
          <div className="kicker">The Economic Primitive</div>
          <h2>
            Value that compounds when <em>life flourishes</em>.
          </h2>
          <p className="big">
            Most systems reward extraction. <b>RVBL rewards regeneration.</b> Presence, care for living systems, and contribution
            become the units of account — so the healthiest networks are, quite literally, the most valuable. This is the moat: an
            incentive layer competitors can&apos;t copy without rebuilding their values.
          </p>
        </section>

        {/* 08 — How It Works */}
        <section className={sc(7)}>
          <div className="kicker">How It Works</div>
          <h2>
            Connect once. Inherit <span className="g">everything</span>.
          </h2>
          <div className="bullets" style={{ marginTop: 34, maxWidth: '70ch' }}>
            <div>
              <span className="tag">FBID</span>
              <p>
                <b>Sovereign identity</b> — one root ID, infinite app connections. The universal address for life.
              </p>
            </div>
            <div>
              <span className="tag">WALLET</span>
              <p>
                <b>Embedded wallets</b> — multi-chain, no seed-phrase friction, appear the moment a user arrives.
              </p>
            </div>
            <div>
              <span className="tag">PRIVACY</span>
              <p>
                <b>Zero-knowledge by design</b> — nullifier-based privacy, client-side encryption, ZK + ICP roadmap.
              </p>
            </div>
            <div>
              <span className="tag">SDK</span>
              <p>
                <b>One drop-in SDK</b> — magic-link → wallet → attestation. Plug in, ship, regenerate.
              </p>
            </div>
          </div>
        </section>

        {/* 09 — Market */}
        <section className={sc(8)}>
          <div className="kicker">Market &amp; Beachhead</div>
          <h2>
            LATAM first.
            <br />
            Regeneration as the wedge.
          </h2>
          <p className="big">
            Every consumer app needs identity, wallets, and onboarding — a multi-billion-dollar infrastructure market. We enter where
            the need is sharpest and the network is real: <b>Latin America&apos;s regenerative and web3 communities</b>, where FlowBond
            already has roots, trust, and distribution. From there, the layer travels with every builder who adopts it.
          </p>
        </section>

        {/* 10 — Living Network */}
        <section className={sc(9)}>
          <div className="kicker">The Living Network</div>
          <h2>Already powering real products.</h2>
          <div className="eco-row">
            <div className="eco">
              <div className="c">Regenerative Finance</div>
              <h4>ReFi platforms</h4>
              <p>Solana-native foundations channeling capital toward living systems.</p>
            </div>
            <div className="eco">
              <div className="c">Cultural Communities</div>
              <h4>Real-world movements</h4>
              <p>Presence-based culture networks across LATAM — identity and belonging on one layer.</p>
            </div>
            <div className="eco">
              <div className="c">Immersive &amp; Commerce</div>
              <h4>Consumer experiences</h4>
              <p>Premium products inheriting identity, wallets, and value out of the box.</p>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="n">Layer 0</span>
              <span className="l">Identity &amp; value root</span>
            </div>
            <div className="stat">
              <span className="n">18+</span>
              <span className="l">Downstream systems</span>
            </div>
            <div className="stat">
              <span className="n">∞</span>
              <span className="l">Apps on one ID</span>
            </div>
          </div>
        </section>

        {/* 11 — Business Model */}
        <section className={sc(10)}>
          <div className="kicker">Business Model</div>
          <h2>SaaS that scales with the network.</h2>
          <p className="big">
            Recurring infrastructure revenue from $14/mo indie builders to $1,499/mo production networks — plus high-margin custom
            builds and advisory. Every app added compounds platform value through shared identity.
          </p>
          <div className="price-row">
            <div className="pcard">
              <div className="nm">Starter</div>
              <div className="am">$14</div>
              <div className="pr">/ month</div>
            </div>
            <div className="pcard feat">
              <div className="nm">Builder</div>
              <div className="am">$149</div>
              <div className="pr">/ month</div>
            </div>
            <div className="pcard">
              <div className="nm">Scale</div>
              <div className="am">$1,499</div>
              <div className="pr">/ month</div>
            </div>
            <div className="pcard">
              <div className="nm">Custom</div>
              <div className="am" style={{ color: 'var(--violet-bright)', fontSize: 'clamp(20px,2.4vw,30px)' }}>
                Let&apos;s talk
              </div>
              <div className="pr">dev packages</div>
            </div>
          </div>
        </section>

        {/* 12 — Founder */}
        <section className={sc(11)}>
          <div className="kicker">The Founder</div>
          <div className="founder-two">
            <div className="f-portrait">
              <Image className="f-photo" src={steph} alt="Steph Ferrera, Founder of FlowBond" fill sizes="(max-width: 820px) 100vw, 30vw" placeholder="blur" />
              <div className="ovl"></div>
            </div>
            <div>
              <h2 style={{ marginBottom: 18 }}>Steph Ferrera</h2>
              <p className="big">
                Visionary and <b>ecosystem builder</b> — guided by the Gene Keys toward a single mission: getting the right tools into
                the right hands to place something lasting for the whole world. She started with cofounders and alliances, then
                outpaced them, shipping the full stack herself: consumer apps, cultural networks, regenerative economies,{' '}
                <b>NFT &amp; digital-art collections</b>, and <b>festivals and immersive experiences</b> that move thousands — plus a
                line of <b>luxury holistic wearables and privacy-first hardware</b>. <b>FlowBond is the engine.</b>
              </p>
              <div className="tags">
                <span>Founder · FlowBond</span>
                <span>Ecosystem Builder</span>
                <span>NFT &amp; Digital Art</span>
                <span>Experience Production</span>
                <span>Gene Keys–guided</span>
              </div>
            </div>
          </div>
        </section>

        {/* 13 — The Ask */}
        <section className={sc(12)}>
          <div className="kicker">The Ask</div>
          <h2>Starting the engine.</h2>
          <div className="ask">
            <div className="row">
              <div className="l">Stage</div>
              <div className="r">Solo-founded, built in the open — collaborators starting the engine across LATAM.</div>
            </div>
            <div className="row">
              <div className="l">Raising</div>
              <div className="r">Mission-aligned capital to harden Layer 0, grow FlowMe OS, and scale the SDK.</div>
            </div>
            <div className="row">
              <div className="l">Advisors</div>
              <div className="r">Forming an equity-aligned board across identity, ReFi, AI, and go-to-market.</div>
            </div>
            <div className="row">
              <div className="l">Looking for</div>
              <div className="r">Partners who back regenerative infrastructure for the long arc — not the quick exit.</div>
            </div>
          </div>
        </section>

        {/* 14 — Closing */}
        <section className={sc(13, 'closing')}>
          <div className="kicker" style={{ justifyContent: 'center' }}>
            In Service of Life
          </div>
          <h1>
            <span
              style={{
                fontStyle: 'italic',
                background: 'linear-gradient(110deg,var(--bone),var(--gold-bright))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              If you can imagine it,
              <br />
              you can program it.
            </span>
          </h1>
          <p className="credit">
            — <b>V. Creativo</b>
          </p>
          <p className="contact">flowbond.life · hello@flowbond.life · docs.flowbond.life</p>
        </section>
      </div>

      <div className="hud">
        <div className="brand">
          <svg className="mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <polygon points="50,6 78,20 94,50 78,80 50,94 22,80 6,50 22,20" stroke="url(#deckmark)" strokeWidth="4" />
            <circle cx="50" cy="50" r="7" fill="#f0c66b" />
            <defs>
              <linearGradient id="deckmark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#c084fc" />
                <stop offset="1" stopColor="#f0c66b" />
              </linearGradient>
            </defs>
          </svg>
          <span>
            <b>FLOW</b>BOND
          </span>
        </div>
        <div className="count">
          <span className="cur">{pad(i + 1)}</span> / <span>{pad(TOTAL)}</span>
        </div>
      </div>
      <div className="arrows">
        <button onClick={() => go(i - 1)} aria-label="previous slide">
          ←
        </button>
        <button onClick={() => go(i + 1)} aria-label="next slide">
          →
        </button>
      </div>
    </>
  )
}
