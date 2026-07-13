// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación de llaves — server gate  (/rotation)
//
//  Three locks, in order, ALL server-side before a byte of plan renders:
//    1. Authenticated FBID session (Supabase cookie via middleware).
//    2. Founder identity: email locked to the root-superadmin email, OR
//       is_superadmin() through the flowbond_grants spine (0002).
//    3. AAL2 — a TOTP factor verified THIS session (Supabase native MFA).
//       At aal1 we render only the step-up screen, never the plan.
//
//  Zero-secret invariant: this surface holds key NAMES + links + progress.
//  Secret values exist only provider-side and in the local macOS Keychain
//  (silent `claudia keys rotate` prompt). A fully compromised session here
//  leaks a checklist, never a credential.
// ════════════════════════════════════════════════════════════════════════

import { serverClient } from '../../lib/supabase-server';
import RotationCockpit, { type CockpitItem } from '../../components/rotation/RotationCockpit';
import StepUp from '../../components/rotation/StepUp';
import SignInGate from '../../components/rotation/SignInGate';
import { ROTATION_PLAN, PARKED, SESSION_TITLES, ALL_STEPS, rotateCmd } from '../../lib/rotation/plan';

export const dynamic = 'force-dynamic';

const FOUNDER_EMAIL = 'cryptocoatl101@gmail.com';

/** Decode a JWT payload without verifying — fine here: the token was already
 *  validated by getUser() below; we only read the `aal` claim off it. */
function jwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1] ?? '';
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

export default async function RotationPage() {
  const sb = await serverClient();

  // Lock 1 — session (getUser() validates against the auth server).
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return <SignInGate />;

  // Lock 2 — founder only. Email lock (root claim is bound to this email)
  // OR the grant spine, so it keeps working if the email ever changes.
  let allowed = user.email?.toLowerCase() === FOUNDER_EMAIL;
  if (!allowed) {
    const { data } = await sb.rpc('is_superadmin');
    allowed = data === true;
  }
  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-8">
        <p className="text-sm text-slate-400">Esta puerta solo se abre para la Guardiana raíz.</p>
      </main>
    );
  }

  // Lock 3 — AAL2 (TOTP verified this session). The session token carries the
  // `aal` claim; at aal1 only the step-up UI renders.
  const { data: { session } } = await sb.auth.getSession();
  const aal = (session ? jwtPayload(session.access_token).aal : 'aal1') as string;
  if (aal !== 'aal2') return <StepUp />;

  // All three locks passed — only NOW does the plan leave the server.
  // (The plan lives in this server component's bundle, never in public
  //  client chunks; below AAL2 the RSC payload contains none of it.)
  const plan: CockpitItem[] = ROTATION_PLAN.map((i) => ({
    ...i,
    steps: i.steps ?? ALL_STEPS,
    cmd: rotateCmd(i.project, i.key.split(' ')[0]),
  }));

  return <RotationCockpit plan={plan} parked={PARKED} sessionTitles={SESSION_TITLES} />;
}
