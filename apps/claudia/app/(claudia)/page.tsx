'use client';

import dynamic from 'next/dynamic';
import { Orb } from '../../components/claudia/Orb';

// ClaudIA is a client-only surface: all crypto (libsodium) runs in the browser
// and must never load on the server. ssr:false keeps the ZK spine off the server
// entirely — there is no server render of her content, by design.
const ClaudiaApp = dynamic(
  () => import('../../components/claudia/ClaudiaApp').then((m) => m.ClaudiaApp),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <Orb size={72} />
          <p style={{ marginTop: 14, fontStyle: 'italic', color: 'rgba(244,241,234,.55)' }}>Despertando… 🌙</p>
        </div>
      </div>
    ),
  },
);

export default function Page() {
  return <ClaudiaApp />;
}
