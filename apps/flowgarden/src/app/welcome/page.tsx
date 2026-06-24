import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#050E07', fontFamily: 'var(--font-sans, system-ui)' }}>

      {/* ════════════════════════════════════════════════════════════
          HERO — Full viewport, dark, organic animations
      ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* ── Ambient colour blooms ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', width: 700, height: 700,
            top: '-20%', left: '-15%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,92,53,0.12) 0%, transparent 70%)',
            animation: 'fg-glow-pulse 14s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 600, height: 600,
            bottom: '-18%', right: '-12%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,169,97,0.07) 0%, transparent 70%)',
            animation: 'fg-glow-pulse 18s ease-in-out 5s infinite',
          }} />
          <div style={{
            position: 'absolute', width: 400, height: 400,
            top: '30%', right: '5%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(143,169,143,0.05) 0%, transparent 70%)',
            animation: 'fg-glow-pulse 20s ease-in-out 8s infinite',
          }} />
        </div>

        {/* ── Giant breathing background mark ── */}
        <div className="absolute pointer-events-none select-none" style={{
          width: '70vw', maxWidth: 720, aspectRatio: '1',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'fg-breathe 16s ease-in-out infinite',
        }}>
          <Image src="/logos/mark/flowgarden-mark-cream-1024.png" alt="" fill className="object-contain" priority />
        </div>

        {/* ── Animated botanical SVG lines ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Left rising vine stem */}
          <path
            d="M -10 920 C 50 780, 90 650, 140 520 C 190 390, 175 280, 250 175 C 315 80, 390 20, 460 -10"
            fill="none" stroke="#C9A961" strokeWidth="1.2" strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, opacity: 0.22,
              animation: 'fg-draw-path 4s cubic-bezier(0.4,0,0.2,1) 0.8s forwards' }}
          />
          {/* Left vine branch 1 */}
          <path
            d="M 140 520 C 185 500, 230 490, 275 480"
            fill="none" stroke="#C9A961" strokeWidth="0.9" strokeLinecap="round"
            style={{ strokeDasharray: 500, strokeDashoffset: 500, opacity: 0.18,
              animation: 'fg-draw-path 1.5s ease-out 3s forwards' }}
          />
          {/* Left vine branch 2 */}
          <path
            d="M 195 295 C 240 278, 285 265, 325 248"
            fill="none" stroke="#8FA98F" strokeWidth="0.8" strokeLinecap="round"
            style={{ strokeDasharray: 500, strokeDashoffset: 500, opacity: 0.22,
              animation: 'fg-draw-path 1.5s ease-out 3.8s forwards' }}
          />
          {/* Left vine branch 3 */}
          <path
            d="M 100 660 C 60 640, 30 620, 5 595"
            fill="none" stroke="#C9A961" strokeWidth="0.7" strokeLinecap="round"
            style={{ strokeDasharray: 500, strokeDashoffset: 500, opacity: 0.15,
              animation: 'fg-draw-path 1.2s ease-out 2.4s forwards' }}
          />

          {/* Right descending tendril */}
          <path
            d="M 1460 -15 C 1380 90, 1350 200, 1300 310 C 1250 420, 1270 510, 1210 600 C 1160 670, 1100 720, 1050 780"
            fill="none" stroke="#C9A961" strokeWidth="1.1" strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, opacity: 0.20,
              animation: 'fg-draw-path 4.2s cubic-bezier(0.4,0,0.2,1) 1.4s forwards' }}
          />
          {/* Right tendril branch 1 */}
          <path
            d="M 1300 310 C 1340 295, 1380 280, 1415 260"
            fill="none" stroke="#8FA98F" strokeWidth="0.8" strokeLinecap="round"
            style={{ strokeDasharray: 500, strokeDashoffset: 500, opacity: 0.20,
              animation: 'fg-draw-path 1.4s ease-out 4.2s forwards' }}
          />
          {/* Right tendril branch 2 */}
          <path
            d="M 1210 600 C 1255 590, 1295 575, 1330 558"
            fill="none" stroke="#C9A961" strokeWidth="0.8" strokeLinecap="round"
            style={{ strokeDasharray: 500, strokeDashoffset: 500, opacity: 0.16,
              animation: 'fg-draw-path 1.3s ease-out 4.8s forwards' }}
          />

          {/* Bottom organic sweep */}
          <path
            d="M 320 915 C 440 880, 560 870, 680 875 C 800 880, 900 870, 1000 875 C 1080 878, 1140 870, 1220 860"
            fill="none" stroke="#8FA98F" strokeWidth="0.9" strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, opacity: 0.14,
              animation: 'fg-draw-path 3s ease-out 2s forwards' }}
          />

          {/* Top center gentle arc */}
          <path
            d="M 480 -8 C 580 30, 660 18, 760 22 C 840 25, 900 12, 980 -5"
            fill="none" stroke="#C9A961" strokeWidth="0.7" strokeLinecap="round"
            style={{ strokeDasharray: 1000, strokeDashoffset: 1000, opacity: 0.12,
              animation: 'fg-draw-path 2.5s ease-out 1.6s forwards' }}
          />

          {/* Scattered bud dots at branch tips */}
          <circle cx="275" cy="480" r="3" fill="#C9A961" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.6s ease-out 4.6s forwards' }} />
          <circle cx="325" cy="248" r="2.5" fill="#8FA98F" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.6s ease-out 5.4s forwards' }} />
          <circle cx="1415" cy="260" r="2.5" fill="#8FA98F" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.6s ease-out 5.6s forwards' }} />
          <circle cx="1330" cy="558" r="2.5" fill="#C9A961" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.6s ease-out 6s forwards' }} />
          <circle cx="5" cy="595" r="2" fill="#C9A961" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.5s ease-out 3.6s forwards' }} />
          <circle cx="1050" cy="780" r="3" fill="#8FA98F" style={{ opacity: 0,
            animation: 'fg-bud-appear 0.6s ease-out 5.8s forwards' }} />

          {/* Leaf shapes — small filled organic ovals */}
          <ellipse cx="288" cy="474" rx="10" ry="5" fill="rgba(201,169,97,0.07)" stroke="rgba(201,169,97,0.15)" strokeWidth="0.5"
            style={{ opacity: 0, transformOrigin: '288px 474px',
              animation: 'fg-leaf-appear 0.8s ease-out 5s forwards' }} />
          <ellipse cx="1318" cy="552" rx="10" ry="5" fill="rgba(143,169,143,0.07)" stroke="rgba(143,169,143,0.15)" strokeWidth="0.5"
            style={{ opacity: 0, transformOrigin: '1318px 552px',
              animation: 'fg-leaf-appear 0.8s ease-out 5.2s forwards' }} />
        </svg>

        {/* ── Floating particles ── */}
        {[
          { w: 4, t: '18%', l: '14%', d: '0s',   dur: '9s',  o: 0.3 },
          { w: 3, t: '72%', l: '8%',  d: '2s',   dur: '11s', o: 0.22 },
          { w: 5, t: '25%', l: '82%', d: '1s',   dur: '13s', o: 0.18 },
          { w: 3, t: '65%', l: '88%', d: '3s',   dur: '8s',  o: 0.28 },
          { w: 4, t: '85%', l: '45%', d: '5s',   dur: '10s', o: 0.18 },
          { w: 2, t: '10%', l: '62%', d: '1.5s', dur: '12s', o: 0.35 },
          { w: 3, t: '48%', l: '4%',  d: '4s',   dur: '15s', o: 0.15 },
          { w: 2, t: '38%', l: '93%', d: '0.5s', dur: '10s', o: 0.22 },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width: p.w, height: p.w, top: p.t, left: p.l,
            backgroundColor: `rgba(201,169,97,${p.o})`,
            filter: 'blur(0.8px)',
            animation: `fg-float-slow ${p.dur} ease-in-out ${p.d} infinite`,
          }} />
        ))}

        {/* ── Hero content ── */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">

          {/* Lockup */}
          <div style={{
            position: 'relative', width: 280, height: 280,
            animation: 'fg-fade-up 1.2s ease-out 0.3s both',
          }}>
            <Image
              src="/logos/lockup/flowgarden-lockup-gold-2048.png"
              alt="FlowGarden — Grow · Flow · Thrive"
              fill className="object-contain" priority
            />
          </div>

          {/* Brand essence */}
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
            color: 'rgba(239,232,216,0.52)',
            maxWidth: 520,
            lineHeight: 1.65,
            fontStyle: 'italic',
            marginTop: '0.5rem',
            marginBottom: '2.5rem',
            animation: 'fg-fade-up 1.2s ease-out 0.8s both',
          }}>
            A living ecosystem where growth is effortless,<br />connected and abundant.
          </p>

          {/* CTA */}
          <div style={{ animation: 'fg-fade-up 1.2s ease-out 1.2s both', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/auth/login"
              className="fg-landing-cta inline-flex items-center gap-2 font-semibold rounded-2xl transition-all"
              style={{
                padding: '14px 32px',
                backgroundColor: '#1A5C35',
                color: '#EFE8D8',
                letterSpacing: '0.04em',
                fontSize: '0.9rem',
                boxShadow: '0 0 0 1px rgba(201,169,97,0.2), 0 8px 32px rgba(26,92,53,0.3)',
              }}
            >
              Open your garden →
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ animation: 'fg-scroll-bounce 2.5s ease-in-out 3s infinite' }}>
          <p style={{ color: 'rgba(239,232,216,0.22)', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Discover
          </p>
          <svg viewBox="0 0 20 20" fill="none" stroke="rgba(201,169,97,0.35)" strokeWidth="1.5" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          WHAT IS FLOWGARDEN — Warm cream, light section
      ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F2EDE3', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ color: '#9B7A28', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
              What is FlowGarden
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: '#18271C',
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: 640,
              margin: '0 auto',
            }}>
              A new way to tend your living world
            </h2>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              {
                icon: '🗺',
                title: 'Living Garden Map',
                desc: 'Zones, plants, structures — one living layout that grows with you. Spatial intelligence for every corner of your land.',
                color: '#1A5C35',
              },
              {
                icon: '🌿',
                title: 'Plant Intelligence',
                desc: 'Track every species, health status, harvest cycle. Your garden\'s complete memory, always accessible.',
                color: '#9B7A28',
              },
              {
                icon: '✦',
                title: 'Missions & Growth',
                desc: 'Turn garden care into a living practice. Complete missions, earn XP, build your garden legacy.',
                color: '#1A5C35',
              },
              {
                icon: '⚡',
                title: 'Sensor Network',
                desc: 'Connect soil sensors, water monitors, and cameras. Your garden speaks — FlowGarden listens.',
                color: '#9B7A28',
              },
            ].map(f => (
              <div key={f.title} style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(15,46,31,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 1px 3px rgba(15,46,31,0.04), 0 4px 14px rgba(15,46,31,0.03)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: f.color === '#1A5C35' ? 'rgba(26,92,53,0.08)' : 'rgba(155,122,40,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#18271C', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(24,39,28,0.55)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          GARDEN INTELLIGENCE — Dark, immersive, with botanical
      ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#071009', padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>

        {/* Decorative mark background */}
        <div className="absolute pointer-events-none select-none" style={{
          width: '55vw', maxWidth: 520, aspectRatio: '1',
          top: '50%', right: '-8%',
          transform: 'translateY(-50%)',
          opacity: 0.04,
        }}>
          <Image src="/logos/mark/flowgarden-mark-cream-1024.png" alt="" fill className="object-contain" />
        </div>

        {/* Botanical accent SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M -10 700 C 60 580, 80 460, 140 360 C 200 260, 200 180, 260 100"
            fill="none" stroke="#C9A961" strokeWidth="1" strokeLinecap="round"
            style={{ opacity: 0.12 }} />
          <path d="M 1210 0 C 1140 100, 1150 220, 1100 340"
            fill="none" stroke="#8FA98F" strokeWidth="0.8" strokeLinecap="round"
            style={{ opacity: 0.10 }} />
        </svg>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 580 }}>
            <p style={{ color: '#C9A961', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 20 }}>
              Garden Intelligence
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
              color: '#EFE8D8',
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 20,
            }}>
              Tell it what you observe. It knows what to do.
            </h2>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              color: 'rgba(239,232,216,0.48)',
              lineHeight: 1.75,
              fontStyle: 'italic',
              marginBottom: 40,
            }}>
              Describe what you see, upload a photo, ask a question. FlowGarden's AI logs every observation, identifies health issues, suggests next actions, and builds your garden's long-term memory.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Natural language logging', sub: 'Just describe what you see. The agent handles the rest.' },
                { label: 'Plant health analysis', sub: 'Upload a photo — get a diagnosis and care plan.' },
                { label: 'Automatic mission creation', sub: 'It sees what needs doing. Tasks appear before you ask.' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C9A961', marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#EFE8D8', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(239,232,216,0.42)' }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS — Sage/medium green
      ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#0E1E10', padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#C9A961', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
            How it works
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            color: '#EFE8D8',
            fontWeight: 700,
            lineHeight: 1.25,
            marginBottom: 64,
          }}>
            Three steps to a living garden
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              {
                n: '01',
                title: 'Create your garden',
                desc: 'Name it, map your zones, add your plants. Invite up to 5 gardeners to tend it together.',
              },
              {
                n: '02',
                title: 'Tell the intelligence',
                desc: 'Log plants, observations, and tasks by chatting or sending a photo. No forms, no friction.',
              },
              {
                n: '03',
                title: 'Watch it grow',
                desc: 'Sensor readings, AI insights, missions, XP — your garden comes alive in real time.',
              },
            ].map(step => (
              <div key={step.n} style={{
                textAlign: 'center',
                padding: '32px 20px',
                borderRadius: 16,
                backgroundColor: 'rgba(239,232,216,0.03)',
                border: '1px solid rgba(239,232,216,0.06)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: 'rgba(201,169,97,0.20)',
                  lineHeight: 1,
                  marginBottom: 16,
                }}>
                  {step.n}
                </p>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#EFE8D8', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'rgba(239,232,216,0.42)', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          COMMUNITY & XP — Light cream, warm
      ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F2EDE3', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#9B7A28', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
              Community
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',
              color: '#18271C',
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 20,
            }}>
              Gardens flourish when tended together
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(24,39,28,0.55)', lineHeight: 1.75, marginBottom: 32 }}>
              Invite up to 5 gardeners to your space. Complete missions as a team, track progress on the leaderboard, and grow your collective XP. Every contribution is logged, every harvest celebrated.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Up to 5 gardeners per garden',
                'XP for every mission completed',
                'Personal invite links with referral rewards',
                'Team leaderboard and shared history',
              ].map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#1A5C35', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.85rem', color: 'rgba(24,39,28,0.62)', fontWeight: 500 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Community visual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Steph', role: 'Garden Owner', xp: 340, medal: '🥇' },
              { name: 'Marco', role: 'Gardener', xp: 210, medal: '🥈' },
              { name: 'Luna', role: 'Gardener', xp: 145, medal: '🥉' },
            ].map(m => (
              <div key={m.name} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid rgba(15,46,31,0.08)',
                boxShadow: '0 1px 3px rgba(15,46,31,0.04)',
              }}>
                <span style={{ fontSize: '1.1rem', width: 24 }}>{m.medal}</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: 'rgba(26,92,53,0.08)',
                  border: '1px solid rgba(26,92,53,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: '#1A5C35',
                }}>
                  {m.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18271C' }}>{m.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(24,39,28,0.45)' }}>{m.role}</p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9B7A28' }}>{m.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FINAL CTA — Dark, with botanical, full brand
      ════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#050E07', padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>

        {/* Background mark */}
        <div className="absolute pointer-events-none select-none" style={{
          width: '60vw', maxWidth: 600, aspectRatio: '1',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
          animation: 'fg-breathe 20s ease-in-out infinite',
        }}>
          <Image src="/logos/mark/flowgarden-mark-cream-1024.png" alt="" fill className="object-contain" />
        </div>

        {/* Bottom botanical lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M 0 800 C 80 700, 100 600, 160 500 C 210 410, 220 340, 280 260"
            fill="none" stroke="#C9A961" strokeWidth="1" strokeLinecap="round" style={{ opacity: 0.14 }} />
          <path d="M 1440 800 C 1360 700, 1340 600, 1280 500 C 1230 410, 1220 340, 1160 260"
            fill="none" stroke="#C9A961" strokeWidth="1" strokeLinecap="round" style={{ opacity: 0.10 }} />
          <path d="M 500 820 C 600 790, 700 785, 800 790 C 900 795, 980 785, 1080 790"
            fill="none" stroke="#8FA98F" strokeWidth="0.7" strokeLinecap="round" style={{ opacity: 0.10 }} />
        </svg>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          {/* Small mark */}
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 32px' }}>
            <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            color: '#EFE8D8',
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Your garden is waiting
          </h2>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '1rem',
            color: 'rgba(239,232,216,0.42)',
            marginBottom: 44,
            lineHeight: 1.6,
          }}>
            Join the regenerative ecosystem. Begin with a seed of intention.
          </p>

          <Link
            href="/auth/login"
            className="fg-landing-cta inline-flex items-center font-semibold rounded-2xl transition-all"
            style={{
              padding: '16px 40px',
              backgroundColor: '#1A5C35',
              color: '#EFE8D8',
              letterSpacing: '0.05em',
              fontSize: '0.9rem',
              boxShadow: '0 0 0 1px rgba(201,169,97,0.25), 0 8px 40px rgba(26,92,53,0.35)',
            }}
          >
            Enter your garden →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        backgroundColor: '#030A04',
        borderTop: '1px solid rgba(239,232,216,0.05)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ position: 'relative', width: 28, height: 28 }}>
          <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" />
        </div>
        <p style={{ color: '#C9A961', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.6 }}>
          GROW · FLOW · THRIVE
        </p>
        <p style={{ color: 'rgba(239,232,216,0.18)', fontSize: '10px', letterSpacing: '0.06em' }}>
          FlowBond · Regenerative Intelligence · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  )
}
