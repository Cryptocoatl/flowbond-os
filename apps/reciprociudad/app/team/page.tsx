import type { Metadata } from 'next';
import TeamConsole from './TeamConsole';

export const metadata: Metadata = {
  title: 'Sani Templo · Consola de equipo',
  description: 'Operación interna de Sani Templo.',
  robots: { index: false, follow: false },
};

export default function TeamPage() {
  return <TeamConsole />;
}
