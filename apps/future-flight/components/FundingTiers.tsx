'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { FundingLevel, LiveFunding } from '@/lib/content'
import { usd } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'
import { ProgressRing } from './ProgressRing'

function LiveBar({ live, label }: { live: LiveFunding; label: string }) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Math.round((live.securedUSD / live.targetUSD) * 100)))
  return (
    <Reveal className="livebar">
      <div className="lbl">{label}</div>
      <div className="track">
        <motion.div
          className="fill"
          initial={{ width: reduce ? `${pct}%` : '0%' }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduce ? 0 : 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        {usd(live.securedUSD)} of {usd(live.targetUSD)} {live.note}
      </div>
    </Reveal>
  )
}

export function FundingTiers({
  eyebrow,
  heading,
  levels,
  live,
  liveLabel,
}: {
  eyebrow: string
  heading: string
  levels: FundingLevel[]
  live: LiveFunding
  liveLabel: string
}) {
  return (
    <section
      className="sec"
      id="funding"
      style={{ background: 'linear-gradient(180deg,transparent,rgba(255,186,0,.05),transparent)' }}
    >
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <div className="fund">
          {levels.map((lv, i) => (
            <Reveal className="flevel" key={lv.level} delay={i * 0.05}>
              <div className="lv">
                Level {lv.level}
                <b>{lv.title}</b>
                <span className="plane-name">{lv.planeName}</span>
              </div>
              <div className="unl">{lv.unlocks}</div>
              <div className="tgt">{lv.targetLabel}</div>
              <ProgressRing pct={lv.pct} />
            </Reveal>
          ))}
        </div>
        <LiveBar live={live} label={liveLabel} />
      </div>
    </section>
  )
}
