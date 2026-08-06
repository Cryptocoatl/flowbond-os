import KaitenApp from './KaitenApp'

/**
 * flowbond.life/kaitenbooks — Juan Carlos Kaiten's writing surface.
 *
 * Unlisted and unlinked: nothing on flowbond.life points here. The real gate
 * is not the URL, it is FBID + row-level security — every table refuses reads
 * and writes to anyone not on `kaiten_members`, so knowing the address gets a
 * stranger a login form and nothing else.
 *
 * Rendered per request so the Supabase URL and publishable key can be read
 * from the Worker's runtime secrets. They cannot be inlined at build time:
 * `NEXT_PUBLIC_*` is substituted during `next build`, and on this deployment
 * the keys only exist as Worker secrets at runtime. Passing them down as
 * props is the honest way, and the anon key is public by design — RLS is what
 * protects the data, not the secrecy of that string.
 */
export const dynamic = 'force-dynamic'

export default function KaitenbooksPage() {
  return (
    <KaitenApp
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}
    />
  )
}
