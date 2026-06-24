// Shared Tianguis (farmers market) constants + types + helpers.
// Used by both server routes and client components.

export interface TianguisProduct {
  id: string
  garden_id: string
  user_id: string
  name: string
  category: string
  description: string | null
  quantity: number
  unit: string
  price_cents: number
  currency: string
  photo_url: string | null
  pickup_label: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  harvest_date: string | null
  available_until: string | null
  status: string
  created_at: string
  updated_at?: string
}

export interface TianguisOrder {
  id: string
  product_id: string
  garden_id: string
  producer_user_id: string
  buyer_user_id: string
  buyer_name: string | null
  buyer_phone: string | null
  quantity: number
  unit: string | null
  item_cents: number
  total_cents: number
  currency: string
  fulfillment: string
  dropoff_label: string | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  delivery_id: string | null
  delivery_provider: string | null
  delivery_status: string | null
  delivery_fee_cents: number | null
  delivery_eta_minutes: number | null
  delivery_distance_m: number | null
  delivery_tracking_url: string | null
  payment_method: string
  status: string
  notes: string | null
  created_at: string
  updated_at?: string
}

export const CATEGORIES = [
  { key: 'vegetables', label: 'Vegetables', emoji: '🥬' },
  { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  { key: 'herbs', label: 'Herbs', emoji: '🌿' },
  { key: 'seedlings', label: 'Seedlings', emoji: '🌱' },
  { key: 'honey', label: 'Honey', emoji: '🍯' },
  { key: 'eggs', label: 'Eggs', emoji: '🥚' },
  { key: 'dairy', label: 'Dairy', emoji: '🧀' },
  { key: 'crafts', label: 'Crafts', emoji: '🧺' },
  { key: 'other', label: 'Other', emoji: '🌾' },
] as const

export const UNITS = ['kg', 'g', 'bunch', 'piece', 'dozen', 'liter', 'jar', 'bag'] as const

export const PRODUCT_STATUSES = ['active', 'sold_out', 'archived'] as const
export const ORDER_STATUSES = ['pending', 'confirmed', 'fulfilled', 'canceled'] as const

export function categoryMeta(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? { key, label: key, emoji: '🌾' }
}

/** Format integer cents into a localized money string. */
export function formatMoney(cents: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format((cents ?? 0) / 100)
  } catch {
    return `$${((cents ?? 0) / 100).toFixed(2)} ${currency}`
  }
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  quoted: 'Quoted',
  requested: 'Requested',
  assigned: 'Rider assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  canceled: 'Canceled',
  failed: 'Failed',
  pending: 'Pending dispatch',
}
