import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@flowbond/ai';
import { authClient } from '@/lib/supabase/server';
import { distanceKm } from '@/lib/geo';
import { KIND_LABEL } from '@/lib/game';
import type { MissionKind, NodeKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MODEL = process.env.BANOSECO_AI_MODEL ?? 'claude-sonnet-4-6';

// Backend-only mission router. Matches a guardian to the best nearby missions.
// PRIVACY (FlowBond layer): Claude receives only a first name, coarse counts
// (xp, energy) and PUBLIC node metadata. Never an email, FBID, full name, or a
// precise user coordinate — the client already sends only a coarse cell.
const SYSTEM = `Eres el "Ruteador" de BAÑOSECO, un juego solarpunk del mundo real para mantener
una red de baños secos, centros de reciclaje y composta en CDMX. Emparejas a un guardián con la
mejor misión cercana según distancia, su energía y su nivel (XP).

Reglas duras:
- NUNCA inventes misiones, nodos ni recompensas: usa SOLO las del contexto.
- Si la energía es 0, no rutees a aceptar; sugiere recargar (energía solar) o donar mientras tanto.
- Prefiere misiones que construyan momentum: cercanas primero, luego por impacto/recompensa.
- Responde cálido, en español de México, breve. Una frase de "headline" y una razón por misión.
- Es operativo y privado: jamás menciones que eres una IA en copy público.`;

const TOOL = {
  name: 'route_missions',
  description: 'Devuelve el ranking de misiones recomendadas para este guardián.',
  input_schema: {
    type: 'object' as const,
    properties: {
      headline: { type: 'string', description: 'Una frase corta para el guardián (es-MX).' },
      ranked: {
        type: 'array',
        description: 'Misiones ordenadas de mejor a peor fit (máx 5).',
        items: {
          type: 'object',
          properties: {
            mission_id: { type: 'string' },
            reason: { type: 'string', description: 'Por qué le conviene, 1 frase.' },
          },
          required: ['mission_id', 'reason'],
        },
      },
    },
    required: ['headline', 'ranked'],
  },
};

interface ToiletEmbed {
  id: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  node_kind: NodeKind;
}
interface MissionRow {
  id: string;
  kind: MissionKind;
  reward_xp: number;
  reward_oro: number;
  toilet: ToiletEmbed | ToiletEmbed[] | null;
}

export async function POST(req: NextRequest) {
  const sb = await authClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { lat?: number; lng?: number; radiusKm?: number };
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'coarse lat/lng required' }, { status: 400 });
  }
  const radiusKm = Math.min(15, Math.max(1, Number(body.radiusKm) || 8));

  // Guardian state (server-side; only counts cross the wire to the model).
  const { data: profRows } = await sb.rpc('banoseco_guardian_profile');
  const prof = Array.isArray(profRows) ? profRows[0] : profRows;
  const firstName =
    (prof?.display_name ?? '').trim().split(/\s+/)[0] || 'guardián';
  const xp = Number(prof?.xp ?? 0);
  const energy = Number(prof?.energy ?? 0);

  // Open missions + their (public) node info.
  const { data, error } = await sb
    .from('banoseco_missions')
    .select('id,kind,reward_xp,reward_oro,toilet:banoseco_toilets!inner(id,name,neighborhood,lat,lng,node_kind)')
    .eq('status', 'open');
  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 });

  const near = ((data ?? []) as MissionRow[])
    .map((m) => {
      const t = Array.isArray(m.toilet) ? m.toilet[0] : m.toilet;
      if (!t) return null;
      const dist = distanceKm({ lat, lng }, { lat: t.lat, lng: t.lng });
      return {
        mission_id: m.id,
        node_id: t.id,
        kind: m.kind,
        label: KIND_LABEL[m.kind],
        node: t.name,
        node_kind: t.node_kind,
        neighborhood: t.neighborhood,
        distance_km: Math.round(dist * 10) / 10,
        reward_xp: m.reward_xp,
        reward_oro: m.reward_oro,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, 12);

  if (near.length === 0) {
    return NextResponse.json({
      headline: 'No hay misiones abiertas cerca todavía — gracias por cuidar la red 🌱',
      ranked: [],
      missions: [],
    });
  }

  const facts = { guardian: { firstName, xp, energy }, radiusKm, missions: near };

  let parsed: { headline: string; ranked: Array<{ mission_id: string; reason: string }> };
  try {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'route_missions' },
      messages: [
        {
          role: 'user',
          content: `Rutea a este guardián a las mejores misiones.\n\nDATOS:\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'tool_use');
    parsed = block && 'input' in block
      ? (block.input as typeof parsed)
      : { headline: 'Esto es lo más cercano:', ranked: [] };
  } catch {
    // Graceful fallback: distance-ranked, no AI. The map still works.
    parsed = {
      headline: 'Lo más cercano a ti:',
      ranked: near.slice(0, 5).map((m) => ({
        mission_id: m.mission_id,
        reason: `${m.label} · ${m.distance_km} km`,
      })),
    };
  }

  // Re-attach full mission data; trust only ids we actually offered.
  const byId = new Map(near.map((m) => [m.mission_id, m]));
  const missions = (parsed.ranked ?? [])
    .map((r) => {
      const m = byId.get(r.mission_id);
      return m ? { ...m, reason: r.reason } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ headline: parsed.headline, ranked: parsed.ranked, missions });
}
