import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentChat } from '@/components/garden/AgentChat'
import { InviteCodeCopy } from '@/components/garden/InviteCodeCopy'

export const dynamic = 'force-dynamic'

function MemberBadge({ name, role }: { name: string | null; role: string }) {
  const initial = (name ?? '?')[0].toUpperCase()
  const color = role === 'owner' ? 'bg-amber-700 text-amber-100' : 'bg-stone-700 text-stone-200'
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${color}`}>
        {initial}
      </div>
      <div>
        <p className="text-xs font-medium text-stone-800">{name ?? 'Unknown'}</p>
        <p className="text-[10px] text-stone-400 capitalize">{role}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const ctx = await getGardenContext()
  if (!ctx?.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const gardenId = ctx.garden.id

  const [zonesRes, plantsRes, tasksRes, sensorRes, xpRes, leaderboardRes] = await Promise.all([
    admin.from('flowgarden_zones').select('id, name').eq('garden_id', gardenId),
    admin.from('flowgarden_plant_groups').select('id, name, quantity, health_status, status').eq('garden_id', gardenId),
    admin.from('flowgarden_tasks').select('id, title, status, urgency, is_mission, due_at, zone_id').eq('garden_id', gardenId).neq('status', 'completed').order('due_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_sensor_readings').select('id, sensor_type, value, unit, recorded_at, zone_id').eq('garden_id', gardenId).order('recorded_at', { ascending: false }).limit(6),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_xp_log').select('amount').eq('user_id', ctx.user.id).eq('garden_id', gardenId),
    // Leaderboard: all XP in this garden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_xp_log').select('user_id, amount').eq('garden_id', gardenId),
  ])

  const zones = zonesRes.data ?? []
  const plants = plantsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const readings = sensorRes.data ?? []
  const totalXp = (xpRes.data ?? []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)

  // Aggregate leaderboard
  const xpByUser = new Map<string, number>()
  for (const row of (leaderboardRes.data ?? []) as { user_id: string; amount: number }[]) {
    xpByUser.set(row.user_id, (xpByUser.get(row.user_id) ?? 0) + row.amount)
  }
  const leaderboard = [...xpByUser.entries()]
    .map(([user_id, xp]) => ({
      user_id,
      xp,
      name: ctx.members.find(m => m.user_id === user_id)?.display_name ?? 'Member',
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5)

  const pendingTasks = tasks.slice(0, 5)
  const totalPlantQty = plants.reduce((sum, p) => sum + (p.quantity ?? 1), 0)
  const healthyPlantQty = plants
    .filter(p => p.health_status === 'good' || p.health_status === 'excellent')
    .reduce((sum, p) => sum + (p.quantity ?? 1), 0)
  const missionsToday = tasks.filter(t => {
    if (!t.is_mission || !t.due_at) return false
    const due = new Date(t.due_at)
    const today = new Date()
    return due.toDateString() === today.toDateString()
  }).length

  const urgencyColor: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-stone-100 text-stone-600',
    low: 'bg-stone-50 text-stone-500',
    none: 'bg-stone-50 text-stone-400',
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-stone-900">{ctx.garden.name}</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {ctx.garden.location_label
                ? `${ctx.garden.location_label} · `
                : ''}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {ctx.garden.invite_code && (
            <InviteCodeCopy code={ctx.garden.invite_code} xp={totalXp} />
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/flowgarden/map" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Zones</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{zones.length}</p>
          <p className="text-xs text-emerald-600 mt-1 group-hover:underline">View map →</p>
        </Link>
        <Link href="/flowgarden/plants" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Plants</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{totalPlantQty}</p>
          <p className="text-xs text-emerald-600 mt-1 group-hover:underline">
            {healthyPlantQty} healthy
          </p>
        </Link>
        <Link href="/flowgarden/tasks" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Missions today</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{missionsToday}</p>
          <p className="text-xs text-amber-600 mt-1 group-hover:underline">
            {tasks.length} pending total
          </p>
        </Link>
        <div className="card">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Gardeners</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{ctx.members.length}</p>
          <p className="text-xs text-stone-400 mt-1">of 5 max</p>
        </div>
      </div>

      {/* Garden members */}
      {ctx.members.length > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Garden members</h2>
            <p className="text-xs text-stone-400">Share the invite code to add more</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {ctx.members.map(m => (
              <MemberBadge key={m.user_id} name={m.display_name} role={m.role} />
            ))}
          </div>
        </div>
      )}

      {/* Tasks + Readings side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pending missions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Active Missions</h2>
            <Link href="/flowgarden/tasks" className="text-xs text-emerald-600 hover:underline">
              All missions →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No pending tasks. Garden is thriving.</p>
          ) : (
            pendingTasks.map(t => {
              const zone = zones.find(z => z.id === t.zone_id)
              return (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.urgency === 'urgent' || t.urgency === 'high' ? 'bg-amber-500' : 'bg-stone-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{t.title}</p>
                    {zone && <p className="text-xs text-stone-400">{zone.name}</p>}
                  </div>
                  <span className={`badge ${urgencyColor[t.urgency] ?? 'bg-stone-100 text-stone-600'}`}>
                    {t.urgency}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Latest readings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Latest Sensor Readings</h2>
            <Link href="/flowgarden/devices" className="text-xs text-emerald-600 hover:underline">
              All data →
            </Link>
          </div>
          {readings.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No readings yet. Connect sensors or add manual readings.</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            readings.map((r: any) => {
              const zone = zones.find(z => z.id === r.zone_id)
              const icons: Record<string, string> = {
                soil_moisture: '💧', temperature: '🌡', humidity: '🌫',
                water_level: '🪣', light: '☀', ph: '⚗', ec: '⚡', water_flow: '🌊',
              }
              const ago = Math.round((Date.now() - new Date(r.recorded_at).getTime()) / 3600000)
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
                  <span className="text-base">{icons[r.sensor_type] ?? '📊'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">
                      {r.value}{r.unit}
                      <span className="text-stone-400 font-normal ml-1">
                        {r.sensor_type.replace(/_/g, ' ')}
                      </span>
                    </p>
                    {zone && <p className="text-xs text-stone-400">{zone.name}</p>}
                  </div>
                  <p className="text-xs text-stone-400">{ago}h ago</p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Leaderboard</h2>
            <Link href="/flowgarden/tasks" className="text-xs text-emerald-600 hover:underline">
              All missions →
            </Link>
          </div>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
              const isMe = entry.user_id === ctx.user.id
              return (
                <div key={entry.user_id} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${isMe ? 'bg-emerald-50 border border-emerald-100' : ''}`}>
                  <span className="text-sm w-6 text-center">{medal}</span>
                  <p className={`text-sm flex-1 font-medium ${isMe ? 'text-emerald-800' : 'text-stone-700'}`}>
                    {entry.name}{isMe ? ' (you)' : ''}
                  </p>
                  <span className="text-xs font-bold text-amber-600">{entry.xp} XP</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Garden Agent */}
      <AgentChat gardenId={gardenId} />
    </div>
  )
}
