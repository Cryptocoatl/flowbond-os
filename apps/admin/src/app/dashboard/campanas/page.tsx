'use client'

import { useState, useEffect } from 'react'
import type { CampaignsConfig } from '@/lib/types'

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<CampaignsConfig>({
    ga4Id: '', googleAdsId: '', googleAdsLabel: '', metaPixelId: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      setCampaigns(d.campaigns ?? campaigns)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaigns }),
    })
    setMsg(res.ok ? '✅ Guardado' : '❌ Error')
    setSaving(false)
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Campañas Google &amp; Meta</h1>
          <p className="text-sm text-gray-500">Conecta Google Analytics, Google Ads y Meta Pixel.</p>
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

      <div className="space-y-5">
        {/* Google Analytics */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-lg">📊</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Google Analytics 4</p>
              <p className="text-xs text-gray-400">Mide el tráfico y comportamiento de visitantes</p>
            </div>
            {campaigns.ga4Id && (
              <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Activo</span>
            )}
          </div>
          <label className="block text-xs text-gray-500 mb-1.5">Measurement ID (G-XXXXXXXXXX)</label>
          <input
            type="text"
            value={campaigns.ga4Id}
            onChange={e => setCampaigns(prev => ({ ...prev, ga4Id: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
            placeholder="G-XXXXXXXXXX"
          />
          <p className="text-xs text-gray-400 mt-2">
            Encuéntralo en <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">analytics.google.com</a> → Admin → Data Streams → tu sitio
          </p>
        </div>

        {/* Google Ads */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg">📈</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Google Ads</p>
              <p className="text-xs text-gray-400">Rastrea conversiones de campañas pagadas</p>
            </div>
            {campaigns.googleAdsId && (
              <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Activo</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Conversion ID (AW-XXXXXXXXXX)</label>
              <input
                type="text"
                value={campaigns.googleAdsId}
                onChange={e => setCampaigns(prev => ({ ...prev, googleAdsId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
                placeholder="AW-XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Conversion Label (opcional)</label>
              <input
                type="text"
                value={campaigns.googleAdsLabel}
                onChange={e => setCampaigns(prev => ({ ...prev, googleAdsLabel: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
                placeholder="XXXXXXXXXXXXXXXXXXX"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Encuéntralo en <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">ads.google.com</a> → Herramientas → Conversiones
          </p>
        </div>

        {/* Meta Pixel */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg">📘</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Meta Pixel (Facebook / Instagram Ads)</p>
              <p className="text-xs text-gray-400">Rastrea conversiones de anuncios en Facebook e Instagram</p>
            </div>
            {campaigns.metaPixelId && (
              <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Activo</span>
            )}
          </div>
          <label className="block text-xs text-gray-500 mb-1.5">Pixel ID (número de 15-16 dígitos)</label>
          <input
            type="text"
            value={campaigns.metaPixelId}
            onChange={e => setCampaigns(prev => ({ ...prev, metaPixelId: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
            placeholder="1234567890123456"
          />
          <p className="text-xs text-gray-400 mt-2">
            Encuéntralo en <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Meta Events Manager</a> → tu Pixel
          </p>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
        <p className="text-xs text-yellow-800 font-medium mb-1">⚡ ¿Cómo funciona?</p>
        <p className="text-xs text-yellow-700">
          Una vez guardados los IDs, el sitio web carga automáticamente los scripts de seguimiento correspondientes.
          No es necesario editar el código del sitio.
        </p>
      </div>
    </div>
  )
}
