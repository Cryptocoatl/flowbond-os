import 'dotenv/config'
import { FlowMeAgent } from './agent'
import { WhatsAppAdapter } from './adapters'

async function main() {
  const adapters = [
    new WhatsAppAdapter('./auth/whatsapp'),
    // new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN!),  // add when ready
  ]

  const agent = new FlowMeAgent(adapters)
  await agent.start()

  process.on('SIGINT', async () => {
    console.log('[FlowMe] Shutting down...')
    await agent.stop()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[FlowMe] Fatal error:', err)
  process.exit(1)
})
