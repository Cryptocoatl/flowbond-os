import Link from 'next/link';
import { serverClient } from '../../../lib/supabase-server';
import { myFbid } from '../../../lib/astro/access';
import AcceptBond from '../../components/AcceptBond';

// AstroBond landing: a personal invitation to see each other's skies.
// Always FBID-first — login → create your chart → accept — then you appear
// in each other's dashboards and constellations, weavable into any universe.
export default async function BondPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sb = await serverClient();
  const [{ data: preview }, fbid] = await Promise.all([
    sb.rpc('bond_preview', { code }),
    myFbid(),
  ]);

  let hasProfile = false;
  if (fbid) {
    const { data } = await sb.from('profiles').select('fbid').eq('fbid', fbid).maybeSingle();
    hasProfile = !!data;
  }

  if (!preview)
    return (
      <Center>
        <h1 className="text-2xl font-serif mb-2">Bond link not found</h1>
        <p className="text-[#9698a8] mb-5">This astrobond link is invalid or expired.</p>
        <Link href="/" className="text-[#b6abec] underline">Go to AstralFlow</Link>
      </Center>
    );

  return (
    <Center>
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(560px 360px at 50% 0%, rgba(154,143,224,0.20), transparent 65%), radial-gradient(420px 300px at 50% 110%, rgba(123,208,198,0.12), transparent 65%)',
          animation: 'af-aurora 10s ease-in-out infinite',
        }}
      />
      <span
        className="inline-block w-14 h-14 rounded-full mb-4 font-serif text-2xl leading-[3.5rem] text-[#0a0b12]"
        style={{
          background: `radial-gradient(circle at 32% 30%, #ffffffcc, ${preview.avatar_color ?? '#9a8fe0'})`,
          boxShadow: `0 0 28px ${preview.avatar_color ?? '#9a8fe0'}aa`,
          animation: 'af-twinkle 4s ease-in-out infinite',
        }}
      >
        {(preview.display_name ?? '?').charAt(0)}
      </span>
      <p className="text-[11px] uppercase tracking-[0.32em] text-[#b6abec] mb-3">An astrobond invitation</p>
      <h1
        className="text-4xl font-serif mb-1"
        style={{
          background: 'linear-gradient(100deg, #ece9e0 25%, #e3c07a 60%, #b6abec 95%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {preview.display_name}
      </h1>
      <p className="font-serif text-lg text-[#cfc8e8] mb-5">
        {preview.sun} Sun · {preview.moon} Moon{preview.rising ? ` · ${preview.rising} Rising` : ''}
      </p>
      <p className="text-sm text-[#b6b3cf] mb-7 leading-relaxed">
        @{preview.handle} invites you to see your AstralFlows together. Bonding makes your skies visible
        to each other — you appear in each other&apos;s dashboards, can read what flows between you, and
        weave each other into collective charts: every constellation a little universe with its own
        collective reading. Your chart stays inside FlowBond&apos;s privacy layer, shared only as deep as you choose.
      </p>
      <AcceptBond code={code} signedIn={!!fbid} hasProfile={hasProfile} />
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="max-w-md mx-auto p-6 mt-14 text-center text-[#ece9e0]">{children}</div>;
}
