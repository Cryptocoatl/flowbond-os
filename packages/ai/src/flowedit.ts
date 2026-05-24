import { getAnthropicClient } from './client'

export type EditField = 'text' | 'src' | 'href' | 'alt' | 'style'

export interface ContentChangeSpec {
  path:       string
  field:      EditField
  value:      Record<string, unknown>
  changeNote: string
}

export type ParseContentChangeResult =
  | { success: true;  changes: ContentChangeSpec[] }
  | { success: false; reason:  string }

const SYSTEM_PROMPT = `You are FlowEdit, an AI assistant that converts natural-language content edit requests into structured content change specifications.

A content path identifies a specific editable element on a page, e.g.:
- "homepage/hero/title"     — the main headline on the homepage hero section
- "homepage/hero/subtitle"  — supporting text under the headline
- "homepage/hero/cta"       — the call-to-action button
- "homepage/hero/image"     — the hero background or feature image
- "homepage/nav/logo"       — the logo in the navigation
- "about/team/description"  — description text on the about/team section

Fields:
- "text"  — editable text content → value: { "text": "..." }
- "src"   — image URL → value: { "src": "https://...", "alt": "..." }
- "href"  — link destination → value: { "href": "https://..." }
- "style" — CSS style overrides → value: { "style": { "color": "#...", "fontSize": "...", ... } }

Rules:
- Respond ONLY with valid JSON. No explanation, no markdown.
- Infer the most likely path and field from the request.
- If the request is ambiguous, make a reasonable best-guess and explain in changeNote.
- If you cannot determine a valid change, respond with: { "success": false, "reason": "..." }
- For successful parses: { "success": true, "changes": [ { "path": "...", "field": "...", "value": {...}, "changeNote": "..." } ] }
- Multiple changes can be returned in a single request.`

export async function parseContentChange(
  prompt: string,
  context?: { siteName?: string; existingPaths?: string[] }
): Promise<ParseContentChangeResult> {
  const client = getAnthropicClient()

  const contextStr = context
    ? `Site: ${context.siteName ?? 'unknown'}\nKnown paths: ${context.existingPaths?.join(', ') ?? 'none'}\n\n`
    : ''

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: `${contextStr}Request: ${prompt}` }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') {
    return { success: false, reason: 'Unexpected response from AI' }
  }

  try {
    return JSON.parse(raw.text) as ParseContentChangeResult
  } catch {
    return { success: false, reason: 'AI returned invalid JSON' }
  }
}
