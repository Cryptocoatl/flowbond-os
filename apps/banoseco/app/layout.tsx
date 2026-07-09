import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Space_Grotesk, Cormorant } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/components/providers/GameProvider';
import { PlayerHUD } from '@/components/hud/PlayerHUD';
import { Toast } from '@/components/ui/Toast';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-display',
  display: 'swap',
});
const hud = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-hud',
  display: 'swap',
});
const codex = Cormorant({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-codex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BAÑOSECO · red regenerativa',
  description:
    'El juego regenerativo del mundo real en CDMX. Activa baños secos, completa misiones, transmuta el residuo en tierra viva. Sobre FlowBond Layer 0.',
  icons: { icon: '/banoseco_logo.svg' },
  applicationName: 'BAÑOSECO',
};

export const viewport: Viewport = {
  themeColor: '#08130F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${hud.variable} ${codex.variable}`}>
      <body>
        <GameProvider>
          <PlayerHUD />
          <main className="wrap">
            {children}
            <footer className="bs-footer">
              <b>BAÑOSECO</b> — baño eco, baño seco.
              <span>Layer 0 · FlowBond · FBID</span>
              <span style={{ marginLeft: 'auto' }}>Piloto: Huerto Roma Verde, CDMX</span>
            </footer>
          </main>
          <Toast />
        </GameProvider>
      </body>
    </html>
  );
}
