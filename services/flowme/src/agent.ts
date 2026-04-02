/**
 * FlowMe Agent — channel-agnostic core logic.
 * Receives IncomingMessage from any adapter, parses intent, executes, replies.
 */
import type { MessagingAdapter, IncomingMessage } from '@flowbond/core'
import { parseIntent } from '@flowbond/ai'
import { handleIntent } from './handlers/intent'
import { getDb, schema } from '@flowbond/db'

export class FlowMeAgent {
  private adapters: MessagingAdapter[]

  constructor(adapters: MessagingAdapter[]) {
    this.adapters = adapters
  }

  async start(): Promise<void> {
    for (const adapter of this.adapters) {
      adapter.onMessage((msg) => this.handleMessage(adapter, msg))
      await adapter.start()
      console.log(`[FlowMe] ${adapter.channel} adapter started`)
    }
  }

  async stop(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.stop()
    }
  }

  private async handleMessage(adapter: MessagingAdapter, msg: IncomingMessage): Promise<void> {
    console.log(`[FlowMe] [${adapter.channel}] from ${msg.from}: ${msg.text}`)

    // Parse intent via Claude
    const intent = await parseIntent(msg.text)

    // Execute intent
    const response = await handleIntent(intent)

    // Log to DB
    await getDb().insert(schema.agentMessages).values({
      channel: msg.channel,
      from: msg.from,
      text: msg.text,
      intent: intent.type,
      response: response.message,
    })

    // Reply via same adapter
    await adapter.send({ to: msg.from, text: response.message })
  }
}
