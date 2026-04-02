export type ClientStatus = 'active' | 'inactive' | 'suspended'

export interface Client {
  id: string
  slug: string
  name: string
  domain: string
  status: ClientStatus
  createdAt: Date
  updatedAt: Date
}

export interface CreateClientInput {
  slug: string
  name: string
  domain: string
}
