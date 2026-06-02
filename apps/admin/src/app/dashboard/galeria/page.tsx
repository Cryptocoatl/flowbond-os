'use client'

import { useState, useEffect, useRef } from 'react'
import type { GalleryImage } from '@/lib/types'

export default function GaleriaPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/data')
    const data = await res.json()
    setImages(data.gallery ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setMsg('')
    const form = new FormData()
    form.append('file', file)
    form.append('caption', caption)
    const res = await fetch('/api/gallery', { method: 'POST', body: form })
    if (res.ok) {
      const img = await res.json()
      setImages(prev => [img, ...prev])
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
      setMsg('✅ Imagen subida correctamente')
    } else {
      setMsg('❌ Error al subir la imagen')
    }
    setUploading(false)
  }

  async function handleDelete(img: GalleryImage) {
    if (!confirm('¿Eliminar esta imagen?')) return
    const res = await fetch('/api/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, pathname: img.pathname }),
    })
    if (res.ok) setImages(prev => prev.filter(i => i.id !== img.id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Galería</h1>
      <p className="text-sm text-gray-500 mb-6">Sube y administra las fotos que aparecen en el sitio web.</p>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm">Subir nueva imagen</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              required
            />
            <p className="text-gray-400 text-sm">📷 Haz clic para seleccionar imagen</p>
            <p className="text-gray-300 text-xs mt-1">JPG, PNG, WebP · Máx 4.5 MB</p>
          </div>
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Descripción / pie de foto (opcional)"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors self-start"
          >
            {uploading ? 'Subiendo...' : 'Subir imagen'}
          </button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🖼️</p>
          <p className="text-sm">No hay imágenes todavía. Sube la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {images.map(img => (
            <div key={img.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group">
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDelete(img)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-500 truncate">{img.caption || 'Sin descripción'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
