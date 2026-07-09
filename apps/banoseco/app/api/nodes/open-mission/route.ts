import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@flowbond/ai';
import { authClient } from '@/lib/supabase/server';
import type { MissionKind, NodeKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MODEL = process.env.BANOSECO_AI_MODEL ?? 'claude-sonnet-4-6';

// Smart mission generation. When an org marks a node full, the AI picks the
// right mission KIND and a fair reward (scaled from the org/global templates,
// clamped), then opens it. Membership is enforced inside banoseco_open_mission,
// so we call it with the user's own session (not service role).
// PRIVACY: only public node metadata reaches the model — no user data at all.
const SYSTEM = `Eres el motor de misiones de BAÑOSECO. Dado un nodo (baño seco, centro de reciclaje,
composta o punto de agua) que se acaba de llenar/necesita atención, eliges UNA misión apropiada y una
recompensa justa, partiendo de las plantillas dadas.

Reglas:
- Elige 'kind' coherente con el node_kind y el estado (p.ej. baño lleno → 'swap' o 'compost_dropoff';
  reciclaje → 'clean'/'sanitize').
- La recompensa debe partir de la plantilla; puedes ajustarla ±50% según dificultad/urgencia, nunca más.
- 'note' es una instrucción corta y concreta para el guardián (es-MX), sin floritura.
- NUNCA inventes datos del nodo.`;

const TOOL = {
  name: 'open_mission',
  description: 'Define la misión a abrir en este nodo.',
  input_schema: {
    type: 'object' as const,
    properties: {
      kind: { type: 'string', enum: ['swap', 'clean', 'sanitize', 'compost_dropoff'] },
      reward_xp: { type: 'number' },
      reward_oro: { type: 'number' },
      note: { type: 'string' },
    },
    required: ['kind', 'reward_xp', 'reward_oro', 'note'],
  },
};

export async function POST(req: NextRequest) {
  const sb = await authClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { nodeId } = (await req.json().catch(() => ({}))) as { nodeId?: string };
  if (!nodeId) return NextResponse.json({ error: 'nodeId required' }, { status: 400 });

  const { data: node } = await sb
    .from('banoseco_toilets')
    .select('id,name,neighborhood,node_kind,org_id,status,uses_since_swap,capacity_uses')
    .eq('id', nodeId)
    .maybeSingle();
  if (!node) return NextResponse.json({ error: 'node_not_found' }, { status: 404 });
  if (!node.org_id) return NextResponse.json({ error: 'node has no org' }, { status: 403 });

  const { data: isMember } = await sb.rpc('banoseco_is_org_member', {
    in_org_id: node.org_id,
    in_min_role: 'steward',
  });
  if (!isMember) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Templates for this node kind (org-specific first, then global defaults).
  const { data: templates } = await sb
    .from('banoseco_mission_templates')
    .select('kind,reward_xp,reward_oro,title,org_id')
    .eq('node_kind', node.node_kind as NodeKind)
    .eq('active', true)
    .or(`org_id.eq.${node.org_id},org_id.is.null`);

  const baseByKind = new Map<string, { xp: number; oro: number }>();
  for (const t of templates ?? []) {
    // org-specific wins over global for the same kind
    const prev = baseByKind.get(t.kind);
    if (!prev || t.org_id) baseByKind.set(t.kind, { xp: t.reward_xp, oro: t.reward_oro });
  }

  const facts = {
    node: {
      name: node.name,
      neighborhood: node.neighborhood,
      node_kind: node.node_kind,
      status: node.status,
      uses_since_swap: node.uses_since_swap,
      capacity_uses: node.capacity_uses,
    },
    templates: Array.from(baseByKind.entries()).map(([kind, v]) => ({ kind, ...v })),
  };

  let kind: MissionKind = 'swap';
  let rewardXp = 50;
  let rewardOro = 25;
  let note: string | null = null;

  try {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'open_mission' },
      messages: [
        { role: 'user', content: `Abre la mejor misión para este nodo.\n\nDATOS:\n${JSON.stringify(facts, null, 2)}` },
      ],
    });
    const block = res.content.find((b) => b.type === 'tool_use');
    if (block && 'input' in block) {
      const out = block.input as { kind: MissionKind; reward_xp: number; reward_oro: number; note: string };
      kind = out.kind;
      rewardXp = out.reward_xp;
      rewardOro = out.reward_oro;
      note = out.note;
    }
  } catch {
    // Fallback to the template base (or defaults) — never block on the model.
    const base = baseByKind.get('swap') ?? { xp: 50, oro: 25 };
    rewardXp = base.xp;
    rewardOro = base.oro;
  }

  // Clamp rewards to ±50% of the template base for the chosen kind (anti-abuse).
  const base = baseByKind.get(kind) ?? { xp: 50, oro: 25 };
  rewardXp = Math.round(Math.min(base.xp * 1.5, Math.max(base.xp * 0.5, rewardXp)));
  rewardOro = Math.round(Math.min(base.oro * 1.5, Math.max(base.oro * 0.5, rewardOro)));

  const { data: missionId, error } = await sb.rpc('banoseco_open_mission', {
    in_node_id: nodeId,
    in_kind: kind,
    in_reward_xp: rewardXp,
    in_reward_oro: rewardOro,
    in_notes: note,
  });
  if (error) return NextResponse.json({ error: 'open_failed', detail: error.message }, { status: 500 });

  return NextResponse.json({ missionId, kind, reward_xp: rewardXp, reward_oro: rewardOro, note });
}
