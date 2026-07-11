'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Book } from '@/lib/openflow/book';
import GateAct from './GateAct';
import WelcomeAct from './WelcomeAct';
import BookAct from './BookAct';
import GiftAct from './GiftAct';
import ClosingAct from './ClosingAct';

type Act = 'gate' | 'welcome' | 'book' | 'gift' | 'closing';
const ACTS: Act[] = ['gate', 'welcome', 'book', 'gift', 'closing'];

/**
 * Five-act state machine: gate → welcome → book → gift → closing.
 * Progress lives in sessionStorage (NOT localStorage: a shared/kiosk device
 * must not stay unlocked forever) and the URL hash mirrors the act so a
 * refresh doesn't reset the journey.
 */
const STORE = 'openflow:journey';

type Journey = { unlocked: boolean; act: Act; part: number };

function load(): Journey {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (raw) {
      const j = JSON.parse(raw) as Journey;
      if (j && ACTS.includes(j.act)) return { unlocked: !!j.unlocked, act: j.act, part: Math.min(7, Math.max(1, j.part || 1)) };
    }
  } catch {}
  return { unlocked: false, act: 'gate', part: 1 };
}

export default function OpenFlowExperience({ book, pdfUrl }: { book: Book; pdfUrl: string }) {
  // SSR/first paint always shows the gate (contentful paint before hydration);
  // a stored journey is restored in the mount effect below.
  const [ready, setReady] = useState(false);
  const [journey, setJourney] = useState<Journey>({ unlocked: false, act: 'gate', part: 1 });

  // restore on mount (hash wins for act if unlocked)
  useEffect(() => {
    const j = load();
    const hashAct = window.location.hash.replace('#', '') as Act;
    if (j.unlocked && ACTS.includes(hashAct) && hashAct !== 'gate') j.act = hashAct;
    if (!j.unlocked) j.act = 'gate';
    setJourney(j);
    setReady(true);
  }, []);

  // persist + mirror to hash
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(journey));
    } catch {}
    const hash = `#${journey.act}`;
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }, [journey, ready]);

  const go = useCallback((act: Act, part?: number) => {
    setJourney((j) => ({ ...j, act, part: part ?? j.part, unlocked: j.unlocked || act !== 'gate' }));
  }, []);

  switch (ready ? journey.act : 'gate') {
    case 'gate':
      return <GateAct onUnlocked={() => go('welcome')} />;
    case 'welcome':
      return <WelcomeAct onOpenBook={() => go('book', 1)} />;
    case 'book':
      return (
        <BookAct
          book={book}
          part={journey.part}
          onPartChange={(n) => setJourney((j) => ({ ...j, part: n }))}
          onFinished={() => go('gift')}
        />
      );
    case 'gift':
      return <GiftAct pdfUrl={pdfUrl} onClosing={() => go('closing')} />;
    case 'closing':
      return <ClosingAct onWalkAgain={() => go('book', 1)} />;
  }
}
