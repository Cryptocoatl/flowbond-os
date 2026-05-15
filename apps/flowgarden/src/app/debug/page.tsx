import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
  // ── (a) Env var presence ───────────────────────────────────────────────────
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  }

  // ── (b) DB connection: SELECT from flowbond_users ─────────────────────────
  let dbResult: { success: boolean; data?: unknown; error?: string } = { success: false }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('flowbond_users')
      .select('id')
      .limit(1)
    if (error) {
      dbResult = { success: false, error: error.message }
    } else {
      dbResult = { success: true, data }
    }
  } catch (err) {
    dbResult = { success: false, error: err instanceof Error ? err.message : String(err) }
  }

  // ── (c) Auth status ───────────────────────────────────────────────────────
  let authResult: { authenticated: boolean; user_id?: string; email?: string; error?: string } = {
    authenticated: false,
  }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      authResult = { authenticated: false, error: error.message }
    } else if (user) {
      authResult = { authenticated: true, user_id: user.id, email: user.email }
    } else {
      authResult = { authenticated: false }
    }
  } catch (err) {
    authResult = { authenticated: false, error: err instanceof Error ? err.message : String(err) }
  }

  // ── (d) Schema check — flowgarden_* tables ────────────────────────────────
  const flowgardenTables = [
    'flowgarden_profiles',
    'flowgarden_gardens',
    'flowgarden_zones',
    'flowgarden_plant_groups',
    'flowgarden_plants',
    'flowgarden_events',
    'flowgarden_tasks',
    'flowgarden_recommendations',
    'flowgarden_sensor_readings',
    'flowgarden_memory_summaries',
    'flowgarden_xp_log',
  ] as const

  type TableCheckResult = { exists: boolean; rows?: number; error?: string }
  const schemaCheck: Record<string, TableCheckResult> = {}

  await Promise.all(
    flowgardenTables.map(async (table) => {
      try {
        const supabase = await createClient()
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        if (error) {
          schemaCheck[table] = { exists: false, error: error.message }
        } else {
          schemaCheck[table] = { exists: true, rows: count ?? 0 }
        }
      } catch (err) {
        schemaCheck[table] = {
          exists: false,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }),
  )

  const schemaAllGreen = Object.values(schemaCheck).every((v) => v.exists)

  const Section = ({ title, data }: { title: string; data: unknown }) => (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.5rem' }}>
        {title}
      </h2>
      <pre style={{ background: '#111', color: '#d1fae5', padding: '1rem',
        borderRadius: '0.5rem', fontSize: '0.8rem', overflowX: 'auto',
        border: '1px solid #1f2937' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '2rem',
      fontFamily: 'monospace' }}>
      <h1 style={{ color: '#34d399', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
        FlowGarden — Debug
      </h1>
      <p style={{ color: '#4b5563', fontSize: '0.75rem', marginBottom: '2rem' }}>
        Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}
      </p>

      <Section title="(a) Env Vars" data={envCheck} />
      <Section title="(b) DB Connection — flowbond_users" data={dbResult} />
      <Section title="(c) Auth Status" data={authResult} />

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          (d) Schema Check — flowgarden_* tables
          <span style={{
            fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem',
            background: schemaAllGreen ? '#065f46' : '#7f1d1d',
            color: schemaAllGreen ? '#d1fae5' : '#fecaca',
          }}>
            {schemaAllGreen ? `${flowgardenTables.length}/${flowgardenTables.length} tables ok` : 'migration pending'}
          </span>
        </h2>
        <pre style={{
          background: '#111', color: '#d1fae5', padding: '1rem',
          borderRadius: '0.5rem', fontSize: '0.8rem', overflowX: 'auto',
          border: '1px solid #1f2937',
        }}>
          {flowgardenTables.map((t) => {
            const r = schemaCheck[t]
            const icon = r.exists ? '✓' : '✗'
            const detail = r.exists ? `rows: ${r.rows}` : `error: ${r.error}`
            return `${icon} ${t.padEnd(35)} ${detail}\n`
          }).join('')}
        </pre>
      </div>
    </div>
  )
}
