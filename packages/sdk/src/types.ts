export interface FlowBondClientConfig {
  appSlug: string
  appSecret?: string
  baseUrl: string
}

// Mirror flowbond_identities schema
export interface Identity {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  evm_address: string | null
  solana_address: string | null
  points_balance: number
  referral_code: string
  is_verified: boolean
  created_at: string
}

export interface WalletConnection {
  id: string
  identity_id: string
  chain: string
  address: string
  provider: string
  is_primary: boolean
  is_active: boolean
  label: string | null
  connected_at: string
}
