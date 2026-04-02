/**
 * Messaging adapter interface — all channels (WhatsApp, Telegram, etc.)
 * must implement this contract. FlowMe core logic only knows about this interface,
 * never about the specific channel SDK.
 */
export interface IncomingMessage {
  id: string
  channel: 'whatsapp' | 'telegram' | 'web'
  from: string        // phone number or user id
  text: string
  timestamp: Date
  raw?: unknown       // original SDK payload for debugging
}

export interface OutgoingMessage {
  to: string
  text: string
  media?: {
    type: 'image' | 'document' | 'audio'
    url: string
  }
}

export interface MessagingAdapter {
  channel: IncomingMessage['channel']
  send(message: OutgoingMessage): Promise<void>
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void
  start(): Promise<void>
  stop(): Promise<void>
}

// Agent intent types
export type AgentIntent =
  | { type: 'SITE_UPDATE'; payload: { clientSlug: string; content: string } }
  | { type: 'SITE_DEPLOY'; payload: { clientSlug: string } }
  | { type: 'SITE_STATUS'; payload: { clientSlug: string } }
  | { type: 'UNKNOWN'; payload: { rawText: string } }

export interface AgentResponse {
  success: boolean
  message: string
  data?: unknown
}
