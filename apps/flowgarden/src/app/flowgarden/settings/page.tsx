export const dynamic = 'force-dynamic'

function SettingRow({
  label,
  description,
  value,
  placeholder,
  type = 'text',
}: {
  label: string
  description?: string
  value?: string
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-stone-50 last:border-0">
      <div className="flex-1 mr-8">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
      </div>
      <div className="w-64">
        <input
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-900 placeholder-stone-300 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-6">
      <h2 className="font-semibold text-stone-900 mb-1">{title}</h2>
      <div className="divide-stone-50">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-400 mt-1">Configure your FlowGarden instance</p>
      </div>

      <Section title="Garden Identity">
        <SettingRow
          label="Garden Name"
          description="Your garden's display name"
          placeholder="My Regenerative Garden"
        />
        <SettingRow
          label="Garden ID"
          description="Unique identifier for multi-garden setups"
          placeholder="garden-home-01"
        />
        <SettingRow
          label="Location"
          description="City or region (used for weather context)"
          placeholder="Buenos Aires, Argentina"
        />
        <SettingRow
          label="Climate Zone"
          description="USDA or Koppen zone for plant recommendations"
          placeholder="Humid subtropical (Cfa)"
        />
      </Section>

      <Section title="Hardware & Sensors">
        <SettingRow
          label="Raspberry Pi Endpoint"
          description="Public URL your Pi will POST sensor data to"
          placeholder="https://your-domain/api/flowgarden/ingest/mock-sensor"
        />
        <SettingRow
          label="API Token (Pi Auth)"
          description="Optional token for securing your ingest endpoint"
          type="password"
          placeholder="Coming soon"
        />
        <SettingRow
          label="Reading Interval"
          description="How often Pi sends readings (seconds)"
          placeholder="300"
        />
      </Section>

      <Section title="AI Features">
        <SettingRow
          label="Anthropic API Key"
          description="Enables AI summaries, plant diagnosis, and recommendations"
          type="password"
          placeholder="sk-ant-…"
        />
        <SettingRow
          label="Weekly Summary Day"
          description="Day of week for automated AI garden report"
          placeholder="Monday"
        />
      </Section>

      <Section title="FlowBond Identity (Future)">
        <div className="py-4">
          <div className="p-4 bg-stone-50 rounded-lg border border-dashed border-stone-200">
            <p className="text-sm font-medium text-stone-600">FlowBond ID not connected</p>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              FlowGarden is designed to connect with your FlowBond identity for cross-app data,
              privacy controls, and decentralized ownership of your garden data.
              This integration is coming soon.
            </p>
            <button className="btn bg-stone-200 text-stone-600 mt-3 text-xs cursor-not-allowed" disabled>
              Connect FlowBond ID (coming soon)
            </button>
          </div>
        </div>
      </Section>

      <Section title="Data & Privacy">
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Export garden data</p>
              <p className="text-xs text-stone-400">Download all zones, plants, journal, tasks as JSON</p>
            </div>
            <button className="btn bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs">
              Export JSON
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-900">Database migration</p>
              <p className="text-xs text-stone-400">Currently using in-memory mock data</p>
            </div>
            <span className="badge bg-amber-50 text-amber-700">Mock mode</span>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button className="btn-primary">Save Settings</button>
      </div>
    </div>
  )
}
