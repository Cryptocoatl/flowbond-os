'use client';

import { useGame } from '@/components/providers/GameProvider';
import { Manifesto } from '@/components/codex/Manifesto';
import { ImpactStats } from '@/components/codex/ImpactStats';
import { SponsorCTA } from '@/components/codex/SponsorCTA';

export default function CodicePage() {
  const { impact } = useGame();
  return (
    <section className="panel">
      <div className="codex">
        <Manifesto />

        <div className="greca" aria-hidden="true" />
        <span className="eyebrow">Regeneración del territorio</span>
        <ImpactStats impact={impact} />

        <SponsorCTA />
      </div>
    </section>
  );
}
