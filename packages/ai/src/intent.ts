import type { AgentIntent } from '@flowbond/core'
import { getAnthropicClient } from './client'

const SYSTEM_PROMPT = `You are FlowMe, an AI agent that manages websites and digital assets for FlowBond OS.

Parse the user's message and respond with a JSON object representing their intent.
Only respond with valid JSON, nothing else.

Supported intents:
- SITE_UPDATE: User wants to update content on a client site
- SITE_DEPLOY: User wants to deploy/publish a client site
- SITE_STATUS: User wants to check the status of a client site
- UNKNOWN: Cannot determine intent

Response format:
{
  "type": "SITE_UPDATE" | "SITE_DEPLOY" | "SITE_STATUS" | "UNKNOWN",
  "payload": {
    // For SITE_UPDATE: { "clientSlug": string, "content": string }
    // For SITE_DEPLOY: { "clientSlug": string }
    // For SITE_STATUS: { "clientSlug": string }
    // For UNKNOWN: { "rawText": string }
  }
}`

export async function parseIntent(text: string): Promise<AgentIntent> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    return { type: 'UNKNOWN', payload: { rawText: text } }
  }

  try {
    return JSON.parse(content.text) as AgentIntent
  } catch {
    return { type: 'UNKNOWN', payload: { rawText: text } }
  }
}
