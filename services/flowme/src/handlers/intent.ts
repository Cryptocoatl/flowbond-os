/**
 * Intent handlers — what to do with each parsed AgentIntent.
 * These call the Core OS API or DB directly.
 */
import type { AgentIntent, AgentResponse } from '@flowbond/core'

const API_BASE = process.env.API_URL ?? 'http://localhost:4000'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json() as Promise<T>
}

export async function handleIntent(intent: AgentIntent): Promise<AgentResponse> {
  switch (intent.type) {
    case 'SITE_STATUS': {
      const data = await apiFetch<{ success: boolean; data?: { name: string; status: string } }>(
        `/api/v1/clients/${intent.payload.clientSlug}`,
      )
      if (!data.success || !data.data) {
        return { success: false, message: `Site "${intent.payload.clientSlug}" not found.` }
      }
      return {
        success: true,
        message: `${data.data.name} is currently ${data.data.status}.`,
        data: data.data,
      }
    }

    case 'SITE_DEPLOY': {
      // TODO: trigger deploy webhook / CI pipeline
      return {
        success: true,
        message: `Deploy triggered for ${intent.payload.clientSlug}. I'll let you know when it's live.`,
      }
    }

    case 'SITE_UPDATE': {
      // TODO: push content update via CMS API
      return {
        success: true,
        message: `Content update queued for ${intent.payload.clientSlug}.`,
      }
    }

    case 'UNKNOWN':
    default:
      return {
        success: false,
        message: `I didn't understand that. Try: "status of flowbond", "deploy flowbond", or "update flowbond with [content]".`,
      }
  }
}
