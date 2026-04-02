/**
 * WhatsApp adapter — implements MessagingAdapter using Baileys.
 * FlowMe core never imports Baileys directly; it only interacts via the adapter interface.
 */
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys'
import { Boom } from '@hapi/boom'
import type { MessagingAdapter, IncomingMessage, OutgoingMessage } from '@flowbond/core'

export class WhatsAppAdapter implements MessagingAdapter {
  readonly channel = 'whatsapp' as const
  private socket: WASocket | null = null
  private messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null
  private authDir: string

  constructor(authDir = './auth/whatsapp') {
    this.authDir = authDir
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler
  }

  async send(message: OutgoingMessage): Promise<void> {
    if (!this.socket) throw new Error('WhatsApp socket not initialized')
    const jid = `${message.to}@s.whatsapp.net`
    await this.socket.sendMessage(jid, { text: message.text })
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir)

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    })

    this.socket.ev.on('creds.update', saveCreds)

    this.socket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log('[WhatsApp] Connection closed. Reconnecting:', shouldReconnect)
        if (shouldReconnect) this.start()
      } else if (connection === 'open') {
        console.log('[WhatsApp] Connected')
      }
    })

    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''

        if (!text || !this.messageHandler) continue

        const incoming: IncomingMessage = {
          id: msg.key.id ?? crypto.randomUUID(),
          channel: 'whatsapp',
          from: msg.key.remoteJid?.replace('@s.whatsapp.net', '') ?? '',
          text,
          timestamp: new Date((msg.messageTimestamp as number) * 1000),
          raw: msg,
        }

        await this.messageHandler(incoming)
      }
    })
  }

  async stop(): Promise<void> {
    await this.socket?.logout()
    this.socket = null
  }
}
