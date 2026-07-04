import { KeyVault } from './components/KeyVault';

export const dynamic = 'force-dynamic';

// The sealed vault is the entry: a private 6-digit code per person turns the key,
// then reveals the recognition documents, the closing checklist, and the real
// audit numbers. The FBID escrow dashboard (full closing flow) remains available
// at /dashboard.
export default function Home() {
  return <KeyVault />;
}
