import Nav from './components/Nav';
import Journey from './components/journey/Journey';
import WaveDivider from './components/WaveDivider';
import Sistema from './components/Sistema';
import Viaje from './components/Viaje';
import Iniciativas from './components/Iniciativas';
import Social from './components/Social';
import JoinFBID from './components/JoinFBID';
import RedViva from './components/RedViva';
import Footer from './components/Footer';
import RevealManager from './components/RevealManager';
import { getSiteContent } from '@/lib/site-content-server';

// Every string and image below is editable from /admin. This window bounds how
// long a cached page may serve old copy; saving in /admin also revalidates on
// demand, so edits land in seconds. Next requires a literal here — keep it in
// sync with CONTENT_TTL in lib/site-content-server.ts.
export const revalidate = 30;

// Ola path variants from the reference (one per transition).
const W_LAGO = 'M0,40 C240,90 480,10 720,45 C960,80 1200,15 1440,55 L1440,90 L0,90 Z';
const W_UNETE = 'M0,55 C240,15 480,80 720,45 C960,12 1200,82 1440,48 L1440,90 L0,90 Z';

export default async function Page() {
  const { copy, media, iniciativas } = await getSiteContent();

  return (
    <>
      <Nav copy={copy} media={media} />
      <main id="top">
        {/* The immersive scroll-scrubbed journey: lago ancestral → Tenochtitlan
            renace → de México al mundo → tu lugar en la red. */}
        <Journey copy={copy} media={media} />

        <WaveDivider d={W_LAGO} fill="#0e4a45" />
        <Sistema copy={copy} />

        <WaveDivider d={W_LAGO} fill="#f4ecd8" flip />
        <Viaje copy={copy} />

        <Iniciativas copy={copy} iniciativas={iniciativas} />
        <Social copy={copy} />

        <WaveDivider d={W_UNETE} fill="#13585a" />
        <section className="section" id="unete">
          <div className="wrap">
            <div className="join reveal">
              <div className="glow" aria-hidden="true" />
              <JoinFBID copy={copy} />
            </div>
          </div>
        </section>

        <RedViva copy={copy} />
      </main>
      <Footer copy={copy} media={media} />
      <RevealManager />
    </>
  );
}
