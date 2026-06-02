import { kv } from '@vercel/kv'
import { del, put } from '@vercel/blob'
import type { SiteData, GalleryImage } from './types'
import { DEFAULT_DATA } from './types'

const KEY = 'mtt:sitedata'

export async function getData(): Promise<SiteData> {
  try {
    const stored = await kv.get<SiteData>(KEY)
    if (!stored) return DEFAULT_DATA
    return {
      prices: stored.prices ?? DEFAULT_DATA.prices,
      gallery: stored.gallery ?? [],
      social: { ...DEFAULT_DATA.social, ...stored.social },
      campaigns: { ...DEFAULT_DATA.campaigns, ...stored.campaigns },
    }
  } catch {
    return DEFAULT_DATA
  }
}

export async function saveData(data: Partial<SiteData>): Promise<void> {
  const current = await getData()
  await kv.set(KEY, { ...current, ...data })
}

export async function uploadImage(
  file: File,
  caption: string
): Promise<GalleryImage> {
  const blob = await put(`gallery/${Date.now()}-${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })

  const image: GalleryImage = {
    id: Date.now().toString(),
    url: blob.url,
    pathname: blob.pathname,
    caption,
  }

  const data = await getData()
  data.gallery.unshift(image)
  await kv.set(KEY, data)

  return image
}

export async function deleteImage(id: string, pathname: string): Promise<void> {
  try {
    await del(pathname)
  } catch {
    // blob may already be gone
  }
  const data = await getData()
  data.gallery = data.gallery.filter((img) => img.id !== id)
  await kv.set(KEY, data)
}
