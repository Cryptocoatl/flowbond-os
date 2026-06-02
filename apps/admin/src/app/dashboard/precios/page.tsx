'use client'

import { useState, useEffect } from 'react'
import type { Price } from '@/lib/types'

export default function PreciosPage() {
  const [prices, setPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      setPrices(d.prices ?? [])
      setLoading(false)
    })
  }, [])

  function update(id: string, field: keyof Price, value: string | number) {
    setPrices(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function addRow() {
    const id = Date.now().toString()
    setPrices(prev => [...prev, { id, route: '', priceUSD: 0, priceNote: '' }])
  }

  function removeRow(id: string) {
    setPrices(prev => prev.filter(p => p.id !== id))
  }

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prices }),
    })
    setMsg(res.ok ? '✅ Precios guardados' : '❌ Error al guardar')
    setSaving(false)
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Precios</h1>
          <p className="text-sm text-gray-500">Edita las tarifas por ruta que aparecen en el sitio.</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm">{msg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Ruta</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium w-32">Precio USD</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium w-40">Nota</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prices.map(p => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={p.route}
                    onChange={e => update(p.id, 'route', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="Aeropuerto Cancún ↔ Tulum"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      value={p.priceUSD || ''}
                      onChange={e => update(p.id, 'priceUSD', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      placeholder="80"
                      min={0}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={p.priceNote}
                    onChange={e => update(p.id, 'priceNote', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="hasta 3 pax"
                  />
                </td>
                <td className="px-3">
                  <button
                    onClick={() => removeRow(p.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar ruta"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-gray-50">
          <button
            onClick={addRow}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            + Agregar ruta
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Los precios con valor 0 no se mostrarán en el sitio. Deja en 0 las rutas que solo se cotizan por WhatsApp.
      </p>
    </div>
  )
}
