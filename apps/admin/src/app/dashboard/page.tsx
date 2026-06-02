import { getData } from '@/lib/storage'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getData()

  const cards = [
    {
      href: '/dashboard/galeria',
      icon: '🖼️',
      title: 'Galería',
      value: `${data.gallery.length} imágenes`,
      action: 'Subir fotos',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      href: '/dashboard/precios',
      icon: '💲',
      title: 'Precios',
      value: `${data.prices.length} rutas`,
      action: 'Editar tarifas',
      color: 'bg-green-50 text-green-700',
    },
    {
      href: '/dashboard/redes',
      icon: '📱',
      title: 'Redes Sociales',
      value: data.social.instagram ? 'Configurado' : 'Sin configurar',
      action: 'Configurar',
      color: 'bg-pink-50 text-pink-700',
    },
    {
      href: '/dashboard/campanas',
      icon: '📈',
      title: 'Google / Meta',
      value: data.campaigns.ga4Id ? 'Conectado' : 'Sin configurar',
      action: 'Configurar',
      color: 'bg-orange-50 text-orange-700',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Resumen</h1>
      <p className="text-sm text-gray-500 mb-8">Bienvenido al panel de administración de Maya Transfers Turquesa.</p>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.color}`}>
                {card.value}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{card.title}</p>
            <p className="text-xs text-teal-600 mt-1">{card.action} →</p>
          </Link>
        ))}
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-xl p-5">
        <h2 className="font-semibold text-teal-800 mb-1 text-sm">🌐 Sitio web en vivo</h2>
        <p className="text-xs text-teal-600 mb-3">
          Los cambios que hagas aquí se reflejan automáticamente en el sitio principal.
        </p>
        <a
          href="https://mayatransferturquesa.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-teal-700 underline"
        >
          mayatransferturquesa.com →
        </a>
      </div>
    </div>
  )
}
