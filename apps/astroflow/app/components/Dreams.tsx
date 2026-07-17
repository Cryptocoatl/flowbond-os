'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// Dreams — "ask AstralFlow what to build next."
// Anyone can post a dream, vote on the wall, or ask FlowMe to dream up ideas
// they can adopt with one tap. This is how the people who use AstralFlow — and
// AstralFlow itself — tell us what to build. Self-contained: drop it anywhere.

interface Dream {
  id: string;
  title: string;
  body: string;
  status: string;
  source: string;
  created_at: string;
  votes: number;
  i_voted: boolean;
  mine: boolean;
  author_handle: string | null;
  author_name: string | null;
  author_color: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  dreaming: 'Dreaming', considering: 'Considering', building: 'Building', shipped: 'Shipped ✦',
};
const STATUS_COLOR: Record<string, string> = {
  dreaming: '#8a8ea3', considering: '#7FE9F6', building: '#8F7CFF', shipped: '#e3c07a',
};

export default function Dreams() {
  const t = useT();
  const sb = browserClient();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState('');
  const [busyVote, setBusyVote] = useState<string>('');
  const [ideas, setIdeas] = useState<{ title: string; body: string }[]>([]);
  const [ideating, setIdeating] = useState(false);

  async function load(nextSort: 'top' | 'new' = sort) {
    const { data } = await sb.rpc('dream_wall', { p_sort: nextSort, p_limit: 60 });
    setDreams((data as Dream[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submit(pTitle: string, pBody: string) {
    const clean = pTitle.trim();
    if (clean.length < 2) { setErr(t('A dream needs a few words')); return; }
    setPosting(true); setErr('');
    const { error } = await sb.rpc('submit_dream', { p_title: clean, p_body: pBody.trim() });
    setPosting(false);
    if (error) { setErr(error.message); return; }
    setTitle(''); setBody('');
    setIdeas((xs) => xs.filter((i) => i.title !== clean));
    setSort('new'); load('new');
  }

  async function vote(d: Dream) {
    setBusyVote(d.id);
    const { data } = await sb.rpc('toggle_dream_vote', { p_dream: d.id });
    setBusyVote('');
    if (data) {
      const r = data as { i_voted: boolean; votes: number };
      setDreams((xs) => xs.map((x) => (x.id === d.id ? { ...x, i_voted: r.i_voted, votes: r.votes } : x)));
    }
  }

  async function withdraw(d: Dream) {
    if (!confirm(t('Withdraw this dream?'))) return;
    await sb.rpc('withdraw_dream', { p_dream: d.id });
    setDreams((xs) => xs.filter((x) => x.id !== d.id));
  }

  async function askAstralFlow() {
    setIdeating(true); setErr('');
    try {
      const res = await fetch('/api/dreams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ existing: dreams.map((d) => d.title) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'FlowMe drew a blank');
      setIdeas(j.ideas ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setIdeating(false);
    }
  }

  function switchSort(s: 'top' | 'new') { setSort(s); setLoading(true); load(s); }

  return (
    <div className="space-y-5">
      {/* Post a dream */}
      <div className="af-card p-4">
        <div className="text-[15px] font-semibold text-[#cfc8e8]">{t('Dream AstralFlow forward')}</div>
        <p className="text-[13px] text-[#8a8ea3] mt-0.5">
          {t('What would make the cosmos feel more alive? Post it. The most-loved dreams get built.')}
        </p>
        <input
          className="af-input mt-3 w-full" maxLength={140}
          placeholder={t('Your dream in a line — e.g. “Tell me when my Saturn return begins”')}
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="af-input mt-2 w-full min-h-[64px]" maxLength={2000}
          placeholder={t('Say more (optional) — why it matters, how you imagine it')}
          value={body} onChange={(e) => setBody(e.target.value)}
        />
        {err && <div className="text-[12px] text-[#f0a0a0] mt-2">{err}</div>}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button className="af-btn af-btn-primary" disabled={posting} onClick={() => submit(title, body)}>
            {posting ? t('Sending…') : t('Post my dream')}
          </button>
          <button className="af-btn af-btn-ghost" disabled={ideating} onClick={askAstralFlow}>
            {ideating ? t('AstralFlow is dreaming…') : t('✦ Ask AstralFlow what would be cool')}
          </button>
        </div>

        {/* FlowMe's ideas — adopt any with one tap */}
        {ideas.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[12px] text-[#7FE9F6]">{t('AstralFlow dreams up:')}</div>
            {ideas.map((i, k) => (
              <div key={k} className="rounded-lg border p-2.5 flex items-start gap-2" style={{ borderColor: '#2c3350', background: '#8F7CFF0d' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#cfc8e8]">{i.title}</div>
                  <div className="text-[12px] text-[#8a8ea3]">{i.body}</div>
                </div>
                <button className="af-btn af-btn-ghost shrink-0 text-[12px] px-2 py-1" disabled={posting} onClick={() => submit(i.title, i.body)}>
                  {t('Adopt →')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The wall */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] text-[#8a8ea3]">{t('The dream wall')}</div>
          <div className="flex gap-1 text-[12px]">
            {(['top', 'new'] as const).map((s) => (
              <button key={s} onClick={() => switchSort(s)}
                className="px-2.5 py-1 rounded-full border"
                style={{ borderColor: sort === s ? '#8F7CFF' : '#2c3350', color: sort === s ? '#cfc8e8' : '#8a8ea3', background: sort === s ? '#8F7CFF1a' : 'transparent' }}>
                {s === 'top' ? t('Most loved') : t('Newest')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-[13px] text-[#8a8ea3] py-6 text-center">{t('Gathering dreams…')}</div>
        ) : dreams.length === 0 ? (
          <div className="text-[13px] text-[#8a8ea3] py-6 text-center">{t('No dreams yet — be the first to dream AstralFlow forward.')}</div>
        ) : (
          <div className="space-y-2">
            {dreams.map((d) => (
              <div key={d.id} className="af-card p-3 flex items-start gap-3">
                <button
                  onClick={() => vote(d)} disabled={busyVote === d.id}
                  className="flex flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 shrink-0 transition-colors"
                  style={{ borderColor: d.i_voted ? '#8F7CFF' : '#2c3350', background: d.i_voted ? '#8F7CFF1a' : 'transparent', color: d.i_voted ? '#cfc8e8' : '#8a8ea3' }}
                  aria-label={t('Love this dream')}
                >
                  <span className="text-[14px] leading-none">✦</span>
                  <span className="text-[12px] font-semibold mt-0.5">{d.votes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-[#cfc8e8]">{d.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: `${STATUS_COLOR[d.status] ?? '#2c3350'}66`, color: STATUS_COLOR[d.status] ?? '#8a8ea3' }}>
                      {t(STATUS_LABEL[d.status] ?? d.status)}
                    </span>
                    {d.source === 'flowme' && <span className="text-[10px] text-[#7FE9F6]">✦ FlowMe</span>}
                  </div>
                  {d.body && <div className="text-[12px] text-[#8a8ea3] mt-0.5">{d.body}</div>}
                  <div className="text-[11px] text-[#5b5e72] mt-1">
                    {d.author_name || d.author_handle || t('a dreamer')}
                    {d.mine && (
                      <> · <button onClick={() => withdraw(d)} className="underline hover:text-[#f0a0a0]">{t('withdraw')}</button></>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
