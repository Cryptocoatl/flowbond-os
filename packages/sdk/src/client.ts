import type { FlowBondClientConfig } from './types'

export class FlowBondClient {
  constructor(public config: FlowBondClientConfig) {
    if (!config.appSlug) throw new Error('appSlug is required')
    if (!config.baseUrl) throw new Error('baseUrl is required')
  }

  // Methods come in Sprint 3
}

export function createFlowBondClient(config: FlowBondClientConfig) {
  return new FlowBondClient(config)
}
