export interface Price {
  id: string
  route: string
  priceUSD: number
  priceNote: string
}

export interface GalleryImage {
  id: string
  url: string
  caption: string
  pathname: string
}

export interface SocialConfig {
  facebook: string
  instagram: string
  tiktok: string
  youtube: string
  whatsapp: string
}

export interface CampaignsConfig {
  ga4Id: string
  googleAdsId: string
  googleAdsLabel: string
  metaPixelId: string
}

export interface SiteData {
  prices: Price[]
  gallery: GalleryImage[]
  social: SocialConfig
  campaigns: CampaignsConfig
}

export const DEFAULT_DATA: SiteData = {
  prices: [
    { id: '1', route: 'Aeropuerto Cancún ↔ Tulum (Hotel)', priceUSD: 0, priceNote: 'hasta 3 pax' },
    { id: '2', route: 'Tulum ↔ Playa del Carmen', priceUSD: 0, priceNote: 'hasta 3 pax' },
    { id: '3', route: 'Tulum ↔ Bacalar', priceUSD: 0, priceNote: 'hasta 3 pax' },
    { id: '4', route: 'Tulum ↔ Parques Xcaret / Xel-Há', priceUSD: 0, priceNote: 'según parque' },
    { id: '5', route: 'Tulum ↔ Cancún Zona Hotelera', priceUSD: 0, priceNote: 'hasta 3 pax' },
  ],
  gallery: [],
  social: {
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    whatsapp: '529842147943',
  },
  campaigns: {
    ga4Id: '',
    googleAdsId: '',
    googleAdsLabel: '',
    metaPixelId: '',
  },
}
