'use client';

import { card } from './CarePanel';
import type { CareItem } from './CarePanel';
import type { ReadyTask } from '../../lib/claudia/client';
import { EMPIRE, EMPIRE_BY_SLUG } from '../../lib/claudia/empire';

interface Mission {
  icon: string;
  text: string;
  href?: string;
  tone: 'care' | 'task' | 'world' | 'guide';
}

// "Misiones · ClaudIA" — her curated next-actions. Everything here is DERIVED
// from real state (care timing, your tasks, which worlds you've connected). She
// never invents work — she only organizes what's already true.
export function SuggestionsPanel({
  connectedBySlug, careItems, tasks, isRoot,
}: {
  connectedBySlug: Record<string, string>;
  careItems: CareItem[];
  tasks: ReadyTask[];
  isRoot: boolean;
}) {
  const missions = buildMissions(connectedBySlug, careItems, tasks, isRoot);

  return (
    <div style={card({ padding: 16 })}>
      <h3 style={heading}>Misiones · ClaudIA</h3>
      {missions.length === 0 && (
        <p style={{ fontSize: 13, color: 'rgba(244,241,234,.4)', fontStyle: 'italic', lineHeight: 1.5 }}>
          Todo en su lugar. Respira — yo vigilo el imperio por ti. 🌊
        </p>
      )}
      {missions.map((m, i) => {
        const inner = (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              padding: '9px 11px', marginBottom: 8, borderRadius: 12,
              background: TONE_BG[m.tone],
              border: `1px solid ${TONE_BORDER[m.tone]}`,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1.3 }}>{m.icon}</span>
            <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45, color: 'rgba(244,241,234,.82)' }}>{m.text}</span>
            {m.href && <span style={{ color: '#2FB6A8', fontSize: 13 }}>↗</span>}
          </div>
        );
        return m.href ? (
          <a key={i} href={m.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </div>
  );
}

function buildMissions(
  connectedBySlug: Record<string, string>,
  careItems: CareItem[],
  tasks: ReadyTask[],
  isRoot: boolean,
): Mission[] {
  const out: Mission[] = [];

  // 0. claim root first — the gate to everything
  if (!isRoot) {
    out.push({ icon: '👑', tone: 'guide', text: 'Reclama tu super-admin: escribe /admin init en el chat.' });
  }

  // 1. care comes before work
  for (const c of careItems) {
    if (c.due) out.push({ icon: c.icon, tone: 'care', text: `${c.label}: pendiente desde hace ${c.since}. Cuídate primero.` });
  }

  // 2. open tasks
  const open = tasks.filter((t) => t.status === 'open');
  if (open.length) {
    out.push({ icon: '✦', tone: 'task', text: `Tienes ${open.length} lista${open.length > 1 ? 's' : ''} abierta${open.length > 1 ? 's' : ''}. ¿Cerramos una hoy?` });
  }

  // 3. connected worlds to check (live ones, first few)
  const connectedLive = Object.keys(connectedBySlug)
    .map((slug) => EMPIRE_BY_SLUG[slug])
    .filter((a): a is NonNullable<typeof a> => !!a && a.status === 'live' && !!a.url)
    .slice(0, 3);
  for (const app of connectedLive) {
    out.push({ icon: app.emoji, tone: 'world', text: `Revisa ${app.name} — ${app.tagline}.`, href: app.url! });
  }

  // 4. growth nudges
  const connectedCount = Object.keys(connectedBySlug).length;
  if (isRoot && connectedCount === 0) {
    out.push({ icon: '🌐', tone: 'guide', text: 'Conecta tu primer mundo abajo para que lo organice por ti.' });
  } else if (isRoot && connectedCount < 3) {
    out.push({ icon: '✨', tone: 'guide', text: `Conecta más mundos (${connectedCount}/${EMPIRE.length}) y los reúno todos aquí.` });
  }

  return out.slice(0, 6);
}

const TONE_BG: Record<Mission['tone'], string> = {
  care: 'rgba(255,138,107,.1)',
  task: 'rgba(255,210,122,.08)',
  world: 'rgba(47,182,168,.08)',
  guide: 'rgba(255,255,255,.03)',
};
const TONE_BORDER: Record<Mission['tone'], string> = {
  care: 'rgba(255,138,107,.28)',
  task: 'rgba(255,210,122,.22)',
  world: 'rgba(47,182,168,.24)',
  guide: 'rgba(244,241,234,.1)',
};
const heading: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(244,241,234,.5)', fontWeight: 400,
};
