import Nav from './components/Nav';
import HeroBackground from './components/HeroBackground';
import WaveDivider from './components/WaveDivider';
import Origen from './components/Origen';
import Sistema from './components/Sistema';
import Viaje from './components/Viaje';
import Iniciativas from './components/Iniciativas';
import Social from './components/Social';
import JoinFBID from './components/JoinFBID';
import Footer from './components/Footer';
import RevealManager from './components/RevealManager';

// Ola path variants from the reference (one per transition).
const W_ARENA = 'M0,60 C240,10 480,90 720,55 C960,20 1200,80 1440,40 L1440,90 L0,90 Z';
const W_LAGO = 'M0,40 C240,90 480,10 720,45 C960,80 1200,15 1440,55 L1440,90 L0,90 Z';
const W_UNETE = 'M0,55 C240,15 480,80 720,45 C960,12 1200,82 1440,48 L1440,90 L0,90 Z';

export default function Page() {
  return (
    <>
      <Nav />
      <main id="top">
        <HeroBackground />

        <WaveDivider d={W_ARENA} fill="#f4ecd8" marginTop={-90} />
        <Origen />

        <WaveDivider d={W_LAGO} fill="#0e4a45" />
        <Sistema />

        <WaveDivider d={W_LAGO} fill="#0e4a45" flip />
        <Viaje />

        <Iniciativas />
        <Social />

        <WaveDivider d={W_UNETE} fill="#13585a" />
        <section className="section" id="unete">
          <div className="wrap">
            <div className="join reveal">
              <div className="glow" aria-hidden="true" />
              <JoinFBID />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <RevealManager />
    </>
  );
}
