'use client'

import { useState, useEffect } from 'react'
import type { SocialConfig } from '@/lib/types'

const FIELDS: { key: keyof SocialConfig; label: string; icon: string; prefix: string }[] = [
  { key: 'facebook', label: 'Facebook', icon: '📘', prefix: 'https://facebook.com/' },
  { key: 'instagram', label: 'Instagram', icon: '📸', prefix: 'https://instagram.com/' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', prefix: 'https://tiktok.com/@' },
  { key: 'youtube', label: 'YouTube', icon: '▶️', prefix: 'https://youtube.com/' },
  { key: 'whatsapp', label: 'WhatsApp (solo número con lada)', icon: '💬', prefix: '' },
]

export default function RedesPage() {
  const [social, setSocial] = useState<SocialConfig>({
    facebook: '', instagram: '', tiktok: '', youtube: '', whatsapp: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      setSocial(d.social ?? social)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ social }),
    })
    setMsg(res.ok ? '✅ Guardado' : '❌ Error')
    setSaving(false)
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Redes Sociales</h1>
          <p className="text-sm text-gray-500">Configura los enlaces de redes que aparecen en el sitio.</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm">{msg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {FIELDS.map(f => (
          <div key={f.key} className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <span>{f.icon}</span>
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              {f.prefix && (
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-l-lg px-3 py-2.5 whitespace-nowrap">
                  {f.prefix}
                </span>
              )}
              <input
                type="text"
                value={social[f.key]}
                onChange={e => setSocial(prev => ({ ...prev, [f.key]: e.target.value }))}
                className={`flex-1 px-4 py-2.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${f.prefix ? 'rounded-r-lg border-l-0' : 'rounded-lg'}`}
                placeholder={f.key === 'whatsapp' ? '529842147943' : `usuario o URL completa`}
              />
            </div>
            {social[f.key] && f.prefix && (
              <a
                href={f.prefix + social[f.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 mt-2 inline-block hover:underline"
              >
                Ver perfil →
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-blue-700 font-medium mb-1">ℹ️ Cómo se usan estos datos</p>
        <p className="text-xs text-blue-600">
          Los enlaces se inyectan automáticamente en el footer y botones del sitio web cuando guardas los cambios.
        </p>
      </div>
    </div>
  )
}
