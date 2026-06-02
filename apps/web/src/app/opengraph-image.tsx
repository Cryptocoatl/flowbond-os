import { ImageResponse } from 'next/og'

// OG image for flowbond.life — the octagon seal on the void, 1200×630.
export const alt = 'FlowBond — The Layer 0 of Life'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function octagonPath(c: number, r: number): string {
  let d = ''
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    d += (i ? 'L' : 'M') + (c + Math.cos(a) * r).toFixed(1) + ' ' + (c + Math.sin(a) * r).toFixed(1) + ' '
  }
  return d + 'Z'
}

// The generative seal as a standalone SVG (rasterized by resvg — gradients OK).
const SEAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="s1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c084fc"/><stop offset=".5" stop-color="#f0c66b"/><stop offset="1" stop-color="#6ef0b8"/>
    </linearGradient>
    <radialGradient id="s2"><stop offset="0" stop-color="#f0c66b" stop-opacity=".5"/><stop offset="1" stop-color="#f0c66b" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="${octagonPath(200, 185)}" fill="none" stroke="url(#s1)" stroke-width="1.5" opacity=".9"/>
  <path d="${octagonPath(200, 150)}" fill="none" stroke="rgba(192,132,252,.5)" stroke-width="1" opacity=".7"/>
  <path d="${octagonPath(200, 110)}" fill="none" stroke="rgba(240,198,107,.6)" stroke-width="1.5" opacity=".8"/>
  <path d="${octagonPath(200, 70)}" fill="none" stroke="rgba(110,240,184,.6)" stroke-width="1" opacity=".7"/>
  <circle cx="200" cy="200" r="28" fill="url(#s2)"/>
  <circle cx="200" cy="200" r="5" fill="#ffd98a"/>
</svg>`
const SEAL_URI = `data:image/svg+xml,${encodeURIComponent(SEAL)}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(60% 60% at 50% 35%, #130a24, #070410)',
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SEAL_URI} width={620} height={620} style={{ position: 'absolute', opacity: 0.85 }} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 22, letterSpacing: 8, color: '#f0c66b', textTransform: 'uppercase' }}>The Layer 0 of Life</div>
          <div style={{ fontSize: 96, fontWeight: 700, color: '#f3ecff', letterSpacing: 6, marginTop: 18 }}>FLOWBOND</div>
          <div style={{ fontSize: 30, color: '#c084fc', marginTop: 22, fontStyle: 'italic' }}>If you can imagine it, you can program it</div>
          <div style={{ fontSize: 18, color: '#a394c2', marginTop: 10 }}>— V. Creativo</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
