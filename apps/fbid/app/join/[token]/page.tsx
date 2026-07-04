import { createClient } from '@/lib/supabase/server'
import { getMyIdentity } from '@flowbond/auth/identity'
import JoinClient from './JoinClient'

export const dynamic = 'force-dynamic'

// ORIGO co-ownership invite. Someone registered a work and assigned this person
// a % share; they land here from their invite link, sign in with FBID, and the
// share is bound to their identity. Preview is public; the claim is authenticated.
type Invite = {
  title: string
  medium: string
  share: number
  invited_name: string
  by_name: string
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  let invite: Invite | null = null
  try {
    const { data } = await supabase.rpc('origo_invite_preview', { p_token: token })
    invite = Array.isArray(data) && data[0] ? (data[0] as Invite) : null
  } catch {
    invite = null
  }

  let signedIn = false
  let handle: string | null = null
  try {
    const id = await getMyIdentity(supabase as never)
    signedIn = !!id
    handle = (id as { handle?: string } | null)?.handle ?? null
  } catch {
    signedIn = false
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <JoinClient token={token} invite={invite} signedIn={signedIn} handle={handle} />
    </main>
  )
}
