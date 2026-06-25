import { KeyVault } from './components/KeyVault';

export const dynamic = 'force-dynamic';

// The sealed vault is the entry: a 4-digit code (Steph 4444 / Russell 4444) turns
// the key, then reveals the recognition documents + the real audit numbers. The
// FBID escrow dashboard (full closing flow) remains available at /dashboard.
export default function Home() {
  return <KeyVault />;
}
