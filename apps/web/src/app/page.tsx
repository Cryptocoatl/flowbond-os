import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Manifesto } from '@/components/Manifesto'
import { Trinity } from '@/components/Trinity'
import { FlowMeOS } from '@/components/FlowMeOS'
import { Layer0 } from '@/components/Layer0'
import { Services } from '@/components/Services'
import { Founder } from '@/components/Founder'
import { Engine } from '@/components/Engine'
import { RVBL } from '@/components/RVBL'
import { Final } from '@/components/Final'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <div className="shell">
      <Nav />
      <main>
      <Hero />
      <Manifesto />
      <Trinity />
      <FlowMeOS />
      <Layer0 />
      <Services />
      <Founder />
      <Engine />
      <RVBL />
      <Final />
      </main>
      <Footer />
    </div>
  )
}
