import { getSiteMembers } from '@/lib/api'
import { InviteForm }     from './InviteForm'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ siteId: string }> }

const roleColors: Record<string, string> = {
  admin:    'bg-purple-50 text-purple-700',
  approver: 'bg-blue-50 text-blue-700',
  editor:   'bg-zinc-100 text-zinc-600',
  viewer:   'bg-zinc-50 text-zinc-400',
}

export default async function MembersPage({ params }: Props) {
  const { siteId } = await params
  const members    = await getSiteMembers(siteId)

  return (
    <div>
      <InviteForm siteId={siteId} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-700">Site Members</h2>
        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">{members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          No members yet — invite a client or partner above.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{member.name}</p>
                <p className="text-xs text-zinc-400 truncate">{member.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role] ?? 'bg-zinc-100 text-zinc-500'}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
