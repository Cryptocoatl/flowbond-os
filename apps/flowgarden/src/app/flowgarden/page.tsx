import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentChat } from '@/components/garden/AgentChat'
import { InviteButton } from '@/components/garden/InviteButton'
import { Greeting } from '@/components/garden/Greeting'
import { HealthRing } from '@/components/garden/HealthRing'

export const dynamic = 'force-dynamic'

function MemberBadge({ name, role }: { name: string | null; role: string }) {
  const initial = (name ?? '?')[0].toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          backgroundColor: role === 'owner' ? 'rgba(201,169,97,0.15)' : 'var(--fg-panel)',
          color: role === 'owner' ? 'var(--fg-gold)' : 'var(--fg-text-secondary)',
          border: role === 'owner' ? '1px solid var(--fg-border-accent)' : '1px solid var(--fg-border)',
        }}
      >
        {initial}
      </div>
      <div>
        <p className="text-xs font-medium text-fg">{name ?? 'Unknown'}</p>
        <p className="text-[10px] text-fg-muted capitalize">{role}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const ctx = await getGardenContext()
  if (!ctx?.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const gardenId = ctx.garden.id

  const [zonesRes, plantsRes, tasksRes, sensorRes, xpRes, leaderboardRes, profileRes] = await Promise.all([
    admin.from('flowgarden_zones').select('id, name').eq('garden_id', gardenId),
    admin.from('flowgarden_plant_groups').select('id, name, quantity, health_status, status').eq('garden_id', gardenId),
    admin.from('flowgarden_tasks').select('id, title, status, urgency, is_mission, due_at, zone_id').eq('garden_id', gardenId).neq('status', 'completed').order('due_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_sensor_readings').select('id, sensor_type, value, unit, recorded_at, zone_id').eq('garden_id', gardenId).order('recorded_at', { ascending: false }).limit(6),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_xp_log').select('amount').eq('user_id', ctx.user.id).eq('garden_id', gardenId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_xp_log').select('user_id, amount').eq('garden_id', gardenId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_profiles').select('personal_invite_code, xp_total').eq('user_id', ctx.user.id).maybeSingle(),
  ])

  const zones = zonesRes.data ?? []
  const plants = plantsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const readings = sensorRes.data ?? []
  const totalXp = (xpRes.data ?? []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)

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

  const personalInviteCode = (profileRes.data as { personal_invite_code: string | null } | null)?.personal_invite_code ?? null

  const myName = ctx.members.find(m => m.user_id === ctx.user.id)?.display_name ?? null

  const pendingTasks = tasks.slice(0, 5)
  const totalPlantQty = plants.reduce((sum, p) => sum + (p.quantity ?? 1), 0)
  const healthyPlantQty = plants
    .filter(p => p.health_status === 'good' || p.health_status === 'excellent')
    .reduce((sum, p) => sum + (p.quantity ?? 1), 0)
  const healthPct = totalPlantQty > 0 ? Math.round((healthyPlantQty / totalPlantQty) * 100) : 0

  const missionsToday = tasks.filter(t => {
    if (!t.is_mission || !t.due_at) return false
    const due = new Date(t.due_at)
    const today = new Date()
    return due.toDateString() === today.toDateString()
  }).length

  // Friendly one-line read on the garden's state, used in the hero band.
  const pulseLine =
    totalPlantQty === 0
      ? 'Add your first plant to start growing 🌱'
      : missionsToday > 0
        ? `${missionsToday} mission${missionsToday > 1 ? 's' : ''} waiting for you today`
        : healthPct >= 70
          ? 'Your garden is thriving — nothing urgent right now'
          : healthPct >= 40
            ? 'A few plants could use some love today'
            : 'Some plants need attention — check your missions'

  const urgencyBadge: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    high:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    medium: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
    low:    'bg-stone-50 text-stone-400 dark:bg-stone-900 dark:text-stone-500',
    none:   'bg-stone-50 text-stone-300 dark:bg-stone-900 dark:text-stone-600',
  }

  return (
    <div className="p-5 md:p-8 max-w-6xl space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Greeting name={myName} />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-fg mt-0.5">
            {ctx.garden.name}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {ctx.garden.location_label ? `${ctx.garden.location_label} · ` : ''}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <InviteButton
          gardenCode={ctx.garden.invite_code ?? null}
          gardenName={ctx.garden.name}
          personalCode={personalInviteCode}
          personalXp={totalXp}
        />
      </div>

      {/* ── Garden pulse hero ── */}
      <div
        className="rounded-2xl p-5 md:p-6 flex items-center gap-5 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, var(--fg-green-muted) 0%, var(--fg-gold-bg) 100%)',
          border: '1px solid var(--fg-border-accent)',
        }}
      >
        <HealthRing healthy={healthyPlantQty} total={totalPlantQty} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-fg-gold">
            Garden pulse
          </p>
          <p className="text-base md:text-lg font-semibold text-fg mt-1 leading-snug">
            {pulseLine}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-fg-muted flex-wrap">
            <span className="badge-gold">⚡ {totalXp} XP</span>
            <span>{totalPlantQty} plants · {zones.length} zones</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            href: '/flowgarden/map',
            label: 'Zones',
            icon: '🗺️',
            value: zones.length,
            sub: 'View map →',
            subColor: 'text-fg-gold',
          },
          {
            href: '/flowgarden/plants',
            label: 'Plants',
            icon: '🌿',
            value: totalPlantQty,
            sub: `${healthyPlantQty} healthy`,
            subColor: 'text-fg-secondary',
          },
          {
            href: '/flowgarden/tasks',
            label: 'Missions today',
            icon: '🎯',
            value: missionsToday,
            sub: `${tasks.length} pending`,
            subColor: 'text-fg-muted',
          },
          {
            href: null,
            label: 'Gardeners',
            icon: '🧑‍🌾',
            value: ctx.members.length,
            sub: 'of 5 max',
            subColor: 'text-fg-dim',
          },
        ].map(s =>
          s.href ? (
            <Link key={s.label} href={s.href} className="stat-card group">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-fg-muted uppercase tracking-widest font-semibold">{s.label}</p>
                <span className="text-base leading-none opacity-80">{s.icon}</span>
              </div>
              <p className="text-3xl font-bold text-fg mt-1.5 font-display">{s.value}</p>
              <p className={`text-xs mt-1.5 transition-colors ${s.subColor} group-hover:underline`}>{s.sub}</p>
            </Link>
          ) : (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-fg-muted uppercase tracking-widest font-semibold">{s.label}</p>
                <span className="text-base leading-none opacity-80">{s.icon}</span>
              </div>
              <p className="text-3xl font-bold text-fg mt-1.5 font-display">{s.value}</p>
              <p className={`text-xs mt-1.5 ${s.subColor}`}>{s.sub}</p>
            </div>
          )
        )}
      </div>

      {/* ── Members ── */}
      {ctx.members.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg">Garden members</h2>
            <p className="text-xs text-fg-muted">Share invite code to add more</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {ctx.members.map(m => (
              <MemberBadge key={m.user_id} name={m.display_name} role={m.role} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tasks + Readings ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Active Missions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg">Active Missions</h2>
            <Link href="/flowgarden/tasks" className="text-xs text-fg-gold hover:underline transition-colors">
              All missions →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-6">No pending tasks. Garden is thriving.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--fg-border)' }}>
              {pendingTasks.map(t => {
                const zone = zones.find(z => z.id === t.zone_id)
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: t.urgency === 'urgent' || t.urgency === 'high'
                          ? '#f59e0b'
                          : 'var(--fg-border)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                      {zone && <p className="text-xs text-fg-muted">{zone.name}</p>}
                    </div>
                    <span className={`badge ${urgencyBadge[t.urgency] ?? urgencyBadge.medium}`}>
                      {t.urgency}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sensor Readings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg">Latest Sensor Readings</h2>
            <Link href="/flowgarden/devices" className="text-xs text-fg-gold hover:underline transition-colors">
              All data →
            </Link>
          </div>
          {readings.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-6">No readings yet. Connect sensors or add manual readings.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--fg-border)' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {readings.map((r: any) => {
                const zone = zones.find(z => z.id === r.zone_id)
                const icons: Record<string, string> = {
                  soil_moisture: '💧', temperature: '🌡', humidity: '🌫',
                  water_level: '🪣', light: '☀', ph: '⚗', ec: '⚡', water_flow: '🌊',
                }
                const ago = Math.round((Date.now() - new Date(r.recorded_at).getTime()) / 3600000)
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="text-base w-5 text-center shrink-0">{icons[r.sensor_type] ?? '📊'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-fg">
                        {r.value}{r.unit}
                        <span className="text-fg-muted font-normal ml-1.5 text-xs">
                          {r.sensor_type.replace(/_/g, ' ')}
                        </span>
                      </p>
                      {zone && <p className="text-xs text-fg-muted">{zone.name}</p>}
                    </div>
                    <p className="text-xs text-fg-dim shrink-0">{ago}h ago</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard ── */}
      {leaderboard.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg">Leaderboard</h2>
            <Link href="/flowgarden/tasks" className="text-xs text-fg-gold hover:underline">
              View missions →
            </Link>
          </div>
          <div className="space-y-1">
            {leaderboard.map((entry, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
              const isMe = entry.user_id === ctx.user.id
              return (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
                  style={{
                    backgroundColor: isMe ? 'var(--fg-gold-bg)' : 'transparent',
                    border: isMe ? '1px solid var(--fg-border-accent)' : '1px solid transparent',
                  }}
                >
                  <span className="text-sm w-6 text-center shrink-0">{medal}</span>
                  <p className="text-sm flex-1 font-medium text-fg">
                    {entry.name}{isMe ? ' (you)' : ''}
                  </p>
                  <span className="text-xs font-bold text-fg-gold">{entry.xp} XP</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Garden Intelligence ── */}
      <AgentChat gardenId={gardenId} />
    </div>
  )
}
