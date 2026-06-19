import { Interaction } from '@/lib/types';

export type InteractionRow = Pick<
  Interaction,
  'id' | 'kind' | 'actor' | 'model' | 'summary' | 'body' | 'channel' | 'direction' | 'occurred_at'
>;

const KIND_ICON: Record<string, string> = {
  note: '✎',
  email: '✉',
  call: '☎',
  meeting: '◎',
  dm: '✦',
  ai_draft: '✦',
  model: '✦',
};

const KIND_LABEL: Record<string, string> = {
  note: 'Note',
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  dm: 'Message',
  ai_draft: 'ClaudIA draft',
  model: 'Model',
};

export function ActivityRail({ items }: { items: InteractionRow[] }) {
  return (
    <div className="cl-rail" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((it) => {
        const who = it.actor ?? (it.kind === 'ai_draft' || it.kind === 'model' ? 'ClaudIA' : '');
        return (
          <div key={it.id} style={{ position: 'relative' }}>
            <span className="cl-dot" style={{ color: 'var(--cl-gold)' }}>
              {KIND_ICON[it.kind] ?? '•'}
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{it.summary}</span>
              <span style={{ color: 'var(--gf-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                {new Date(it.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 2 }}>
              {KIND_LABEL[it.kind] ?? it.kind}
              {who ? ` · ${who}` : ''}
              {it.model ? ` · ${it.model}` : ''}
              {it.channel ? ` · ${it.channel}` : ''}
            </div>
            {it.body && (
              <div style={{ fontSize: 12, color: 'var(--gf-text)', opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
                {it.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
