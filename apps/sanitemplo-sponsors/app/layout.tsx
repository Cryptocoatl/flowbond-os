import type { Metadata } from 'next';
import { Marcellus, Karla, JetBrains_Mono } from 'next/font/google';
import { tokenVars } from '@/app/components/sanitemplo/tokens';
import '@/app/components/sanitemplo/sponsors.css';

const marcellus = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-marcellus', display: 'swap' });
const karla = Karla({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-karla', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Sani Templo · Patrocina visitas dignas',
  description:
    'No compras un panel. Compras visitas. $11 cada una, para el gobierno y para la familia artesana. Un Sani Templo se paga solo con 15 visitas al día.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const style = tokenVars({
    display: `var(${marcellus.variable})`,
    body: `var(${karla.variable})`,
    mono: `var(${jetbrains.variable})`,
  }) as React.CSSProperties;
  return (
    <html lang="es">
      <body className={`${marcellus.variable} ${karla.variable} ${jetbrains.variable}`}>
        <div className="st-root" style={style}>
          {children}
        </div>
      </body>
    </html>
  );
}
