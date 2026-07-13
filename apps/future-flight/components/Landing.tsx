import { defaultContent, type LandingContent } from '@/lib/content'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Pillars } from '@/components/Pillars'
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { Tiers } from '@/components/Tiers'
import { Sponsors } from '@/components/Sponsors'
import { FundingTiers } from '@/components/FundingTiers'
import { Passport } from '@/components/Passport'
import { Included } from '@/components/Included'
import { Stats } from '@/components/Stats'
import { EscrowFlow } from '@/components/EscrowFlow'
import { Footer } from '@/components/Footer'

/**
 * Future Flight marketing landing.
 *
 * `content` defaults to `defaultContent` (values from index.html). In Phase 4
 * this page becomes a Server Component that loads the active edition from
 * ff_editions / ff_ticket_tiers / ff_funding_levels / ff_sponsor_packages and
 * passes it in as `content` — no component changes required.
 */
export function Landing({ content = defaultContent }: { content?: LandingContent }) {
  const c = content
  return (
    <>
      <Nav brandName={`${c.edition.wordmarkTop} ${c.edition.wordmarkBottom}`} />
      <Hero edition={c.edition} routeStrip={c.routeStrip} />
      <Pillars pillars={c.pillars} band={c.band} />
      <ExperienceTimeline
        eyebrow={c.experience.eyebrow}
        heading={c.experience.heading}
        steps={c.experience.steps}
      />
      <Tiers
        eyebrow={c.tickets.eyebrow}
        heading={c.tickets.heading}
        tiers={c.tickets.tiers}
        membershipLabel={c.tickets.membershipLabel}
        memberships={c.tickets.memberships}
        membershipNote={c.tickets.membershipNote}
      />
      <Sponsors
        eyebrow={c.sponsors.eyebrow}
        heading={c.sponsors.heading}
        packages={c.sponsors.packages}
      />
      <FundingTiers
        eyebrow={c.funding.eyebrow}
        heading={c.funding.heading}
        levels={c.funding.levels}
        live={c.funding.live}
        liveLabel={c.funding.liveLabel}
      />
      <Passport
        eyebrow={c.passport.eyebrow}
        heading={c.passport.heading}
        preview={c.passport.preview}
        features={c.passport.features}
      />
      <Included eyebrow={c.included.eyebrow} items={c.included.items} />
      <Stats stats={c.stats} />
      <EscrowFlow
        eyebrow={c.escrow.eyebrow}
        heading={c.escrow.heading}
        nodes={c.escrow.nodes}
        trust={c.escrow.trust}
        ctaHeading={c.escrow.ctaHeading}
      />
      <Footer creed={c.footer.creed} poweredBy={c.footer.poweredBy} />
    </>
  )
}
