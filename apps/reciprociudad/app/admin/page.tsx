import type { Metadata } from 'next';
import AdminClient from './AdminClient';

/**
 * /admin — the console Fer uses to edit reciprociudad.lat.
 *
 * The page itself is public HTML; the gate is the database. Every read and
 * write goes through a SECURITY DEFINER RPC that checks the caller against
 * `reciprociudad.site_admins`, so an unauthorised visitor sees the login card
 * and nothing else — there is no data on this page to leak.
 */
export const metadata: Metadata = {
  title: 'Editar Reciprociudad',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminClient />;
}
