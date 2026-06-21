export default function Origen() {
  return (
    <section className="section" id="origen">
      <div className="wrap">
        <div className="origen-grid">
          <div className="origen-text reveal">
            <span className="eyebrow">El origen</span>
            <h2 className="display-md">
              Todo empezó <em className="oro">en el agua</em>.
            </h2>
            <p>
              La ciudad-lago no separaba el alimento del agua, ni a las personas del territorio. Las{' '}
              <b>chinampas</b> convertían lodo y restos en tierra fértil. Los <b>canales</b> movían lo
              que cada barrio producía. El <b>tianguis</b> cerraba el círculo. Nada se desperdiciaba.
            </p>
            <p>
              Reciprociudad toma esa inteligencia ancestral y la vuelve red: <b>ancestral</b> en su
              raíz, <b>solarpunk</b> en su forma, <b>regenerativa</b> en su propósito.
            </p>
          </div>
          <div className="glass reveal" aria-hidden="true">
            <svg viewBox="0 0 400 500">
              <rect width="400" height="500" fill="#0c3a37" />
              <g fill="#2f9e6e" opacity=".9">
                <path d="M40,60 q60,-20 120,0 q60,20 0,60 q-60,20 -120,0 q-60,-20 0,-60 Z" />
                <path d="M230,120 q60,-20 120,0 q40,30 -10,60 q-60,20 -110,-6 q-40,-30 0,-54 Z" />
                <path d="M60,250 q70,-24 140,4 q40,34 -16,64 q-70,20 -124,-10 q-36,-30 0,-58 Z" />
                <path d="M250,300 q56,-18 96,10 q30,30 -16,54 q-56,16 -90,-12 q-26,-26 10,-52 Z" />
                <path d="M120,400 q60,-18 110,6 q30,28 -18,50 q-60,16 -96,-12 q-24,-22 4,-44 Z" />
              </g>
              <g stroke="#22c4b2" strokeWidth="2.5" fill="none" opacity=".7" strokeLinecap="round">
                <path d="M0,120 C120,150 280,90 400,150" />
                <path d="M0,290 C140,250 260,330 400,280" />
                <path d="M120,0 C150,160 90,330 160,500" />
                <path d="M300,0 C270,140 330,320 280,500" />
              </g>
              <g fill="#ffd98a">
                <circle cx="100" cy="90" r="4" />
                <circle cx="290" cy="150" r="4" />
                <circle cx="130" cy="280" r="5" />
                <circle cx="300" cy="330" r="4" />
                <circle cx="175" cy="430" r="4" />
              </g>
              <circle className="pulse" r="4.5" fill="#fff2cf">
                <animateMotion dur="7s" repeatCount="indefinite" path="M120,0 C150,160 90,330 160,500" />
              </circle>
              <circle className="pulse" r="4.5" fill="#9fd356">
                <animateMotion dur="9s" repeatCount="indefinite" path="M0,290 C140,250 260,330 400,280" />
              </circle>
              <circle className="pulse" r="4" fill="#22c4b2">
                <animateMotion dur="8s" repeatCount="indefinite" path="M300,0 C270,140 330,320 280,500" />
              </circle>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
