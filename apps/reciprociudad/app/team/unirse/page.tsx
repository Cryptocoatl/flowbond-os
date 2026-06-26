import type { Metadata } from 'next';
import JoinClient from './JoinClient';

export const metadata: Metadata = {
  title: 'Sani Templo · Únete al equipo',
  description: 'Crea tu perfil y cuéntanos cómo quieres participar en Sani Templo.',
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return <JoinClient />;
}
