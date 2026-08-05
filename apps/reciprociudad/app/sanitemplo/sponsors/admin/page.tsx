import type { Metadata } from 'next';
import AdminClient from '@/app/components/sanitemplo/AdminClient';

export const metadata: Metadata = {
  title: 'Sani Templo · Panel',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
