import Intro from "@/components/Intro";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ImmersiveScroll from "@/components/ImmersiveScroll";
import TokenBand from "@/components/TokenBand";
import Ecosystem from "@/components/Ecosystem";
import Refi from "@/components/Refi";
import Circula from "@/components/Circula";
import VerifySection from "@/components/VerifySection";
import Quests from "@/components/Quests";
import Fest from "@/components/Fest";
import Footer from "@/components/Footer";
import RevealObserver from "@/components/RevealObserver";

export default function Page() {
  return (
    <>
      <Intro />
      <Nav />
      <Hero />
      <ImmersiveScroll />
      <TokenBand />
      <Ecosystem />
      <Refi />
      <Circula />
      <VerifySection />
      <Quests />
      <div className="greca" aria-hidden="true" />
      <Fest />
      <Footer />
      <RevealObserver />
    </>
  );
}
