'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';
import BondInvite from './BondInvite';
import FindFriends from './FindFriends';
import QrPanel from './QrPanel';
import ChartedSouls, { type Soul, type OwnedMap } from './ChartedSouls';

interface Me {
  handle: string;
  display_name: string;
  visibility: string;
}
interface Member {
  handle?: string;          // absent on guests — they have no profile yet
  display_name: string;
  avatar_color: string;
  guest?: boolean;
  claimed?: boolean;
  claim_code?: string | null; // owner only — personalized invite link
}
interface FlowMap {
  id: string;
  name: string;
  context: string;
  is_owner: boolean;
  members: Member[] | null;
  created_at: string;
}
interface Person {
  handle: string;
  display_name: string;
}
interface Friend extends Person {
  status: string;
}
interface ReqRow extends Person {
  status: string;
}
interface Allowance extends Person {
  level: string;
  context: string;
}
interface AudienceRow extends Person {
  avatar_color: string;
  reads: number;
  last_read: string;
}

// How deep a share goes, in order. open_heart = full transparency.
const LEVELS = ['light', 'standard', 'deep', 'open_heart'] as const;
const LEVEL_LABEL: Record<string, string> = {
  light: 'light', standard: 'standard', deep: 'deep', open_heart: 'open heart',
};
const CONTEXTS = ['friendship', 'romantic', 'project', 'house', 'family', 'crew', 'app'] as const;
interface Crew {
  id: string;
  name: string;
  invite_code: string;
  is_owner: boolean;
  members: Member[] | null;
}

export default function DashboardClient({
  me,
  maps,
  requests,
  allowances,
  friends,
  crews,
  audience,
  souls,
  ownedMaps,
}: {
  me: Me | null;
  maps: FlowMap[];
  requests: ReqRow[];
  allowances: Allowance[];
  friends: Friend[];
  crews: Crew[];
  audience: AudienceRow[];
  souls: Soul[];
  ownedMaps: OwnedMap[];
}) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [grantHandle, setGrantHandle] = useState('');
  const [grantLevel, setGrantLevel] = useState<string>('standard');
  const [grantContext, setGrantContext] = useState<string>('friendship');
  const [crewName, setCrewName] = useState('');
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmErase, setConfirmErase] = useState('');
  const sb = browserClient();

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://astro.flowbond.life';
  const inviteUrl = (code: string) => `${origin}/join/${code}`;

  function createCrew() {
    if (!crewName.trim()) return;
    setMsg('');
    start(async () => {
      const { error } = await sb.rpc('create_crew', { crew_name: crewName.trim() });
      setMsg(error ? error.message : t('Crew "{name}" created', { name: crewName }));
      if (!error) {
        setCrewName('');
        router.refresh();
      }
    });
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  }

  function act(fn: () => Promise<{ error: any }>, ok: string) {
    setMsg('');
    start(async () => {
      const { error } = await fn();
      setMsg(error ? error.message : ok);
      if (!error) router.refresh();
    });
  }

  const grant = (h: string, lvl = grantLevel, ctx = grantContext) =>
    act(
      async () => await sb.rpc('grant_access', { target_handle: h.replace(/^@/, ''), lvl, ctx }),
      t('Shared with @{handle} ({level} · {context})', { handle: h, level: LEVEL_LABEL[lvl], context: ctx }),
    );
  const revoke = (h: string) =>
    act(async () => await sb.rpc('revoke_access', { target_handle: h }), t('Revoked @{handle}', { handle: h }));
  // Erase a bond — mutual + sticky: they leave your flow both ways, and can only
  // come back by requesting access (which you approve). Not the same as 'revoke'.
  const eraseBond = (h: string) =>
    act(
      async () => await sb.rpc('erase_bond', { peer_handle: h }),
      t("Bond with @{handle} erased. You're both out of each other's flow — they'd need to request to reconnect.", { handle: h }),
    );

  const pendingReqs = requests.filter((r) => r.status === 'pending');

  return (
    <div className="max-w-3xl mx-auto p-6 text-[#ece9e0]">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">{t('Your AstralFlow')}</h1>
          {me ? (
            <p className="text-xs font-mono text-[#5b5e72]">@{me.handle} · {me.visibility}</p>
          ) : (
            <p className="text-sm text-[#9698a8]">{t("You don't have a chart yet.")}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]">
            {t('Constellation')}
          </Link>
          <Link href="/profile/new" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec]">
            {me ? t('Edit chart') : t('+ Add chart')}
          </Link>
        </div>
      </header>

      <Link href="/privacy" className="flex items-center justify-between rounded-xl border border-[#9a8fe0]/25 bg-[#9a8fe0]/[0.06] px-4 py-3 mb-6 hover:border-[#9a8fe0]/50 transition">
        <span className="text-sm text-[#cfc8e8]">🛡 {t('Your data & sovereignty')}</span>
        <span className="text-xs text-[#9698a8]">{t('see who you’re weaved with · manage · erase')} →</span>
      </Link>

      {msg && <p className="text-sm text-[#7fd1a8] mb-4">{msg}</p>}

      {/* Crews — invite people, share charts across the group */}
      <Section title={t('Your crews')}>
        <div className="flex gap-2 mb-3">
          <input
            value={crewName}
            onChange={(e) => setCrewName(e.target.value)}
            placeholder={t('Name a crew (e.g. Tulum crew)')}
            className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={createCrew}
            disabled={pending || !crewName.trim()}
            className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-50"
          >
            {t('Create')}
          </button>
        </div>
        {crews.length === 0 ? (
          <Empty>{t('No crews yet. Create one, share the invite link, and your people join with one tap.')}</Empty>
        ) : (
          <div className="space-y-3">
            {crews.map((c) => (
              <div key={c.id} className="border border-[#242a3b] rounded-xl p-4 bg-[#11131f]">
                <div className="flex items-center justify-between">
                  <div className="font-serif text-lg">{c.name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                    {(c.members ?? []).length} {(c.members ?? []).length === 1 ? t('member') : t('members')}
                    {c.is_owner ? t(' · host') : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(c.members ?? []).map((mem) => (
                    <Link
                      key={mem.handle}
                      href={`/chart/${mem.handle}`}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: `${mem.avatar_color}22`, color: '#cfc8e8' }}
                    >
                      {mem.display_name}
                    </Link>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    readOnly
                    value={inviteUrl(c.invite_code)}
                    className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-1.5 text-xs text-[#9698a8] font-mono"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() => copyInvite(c.invite_code)}
                    className="text-xs bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-lg px-3"
                  >
                    {copied === c.invite_code ? t('Copied ✓') : t('Copy invite')}
                  </button>
                </div>
                <div className="mt-2">
                  <QrPanel
                    url={inviteUrl(c.invite_code)}
                    label={t('Show join QR')}
                    caption={t('Scan to join “{name}” — sign in and your charts read together collectively.', { name: c.name })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Collective charts */}
      <Section title={t('Your collective charts')}>
        {maps.length === 0 ? (
          <Empty>
            {t('No flow maps yet. In the constellation, switch to')} <b>{t('Combine')}</b>, {t('weave people together, and save them as a flow map.')}
          </Empty>
        ) : (
          <div className="space-y-3">
            {maps.map((m) => (
              <div key={m.id} className="border border-[#242a3b] rounded-xl p-4 bg-[#11131f]">
                <div className="flex items-center justify-between">
                  <Link href={`/map/${m.id}`} className="font-serif text-lg hover:text-[#e3c07a]">
                    {m.name} <span className="text-xs text-[#5b5e72]">→</span>
                  </Link>
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                    {m.context}{m.is_owner ? '' : t(' · added by a friend')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(m.members ?? []).map((mem, i) =>
                    mem.guest ? (
                      <span
                        key={`g${i}`}
                        className="text-xs px-2.5 py-1 rounded-full border border-dashed"
                        style={{ borderColor: `${mem.avatar_color}66`, color: '#9698a8' }}
                        title={mem.claimed ? t('claimed their chart') : t('guest — not in the flow yet')}
                      >
                        {mem.display_name} {mem.claimed ? '✓' : t('·  guest')}
                      </span>
                    ) : (
                      <Link
                        key={mem.handle}
                        href={`/chart/${mem.handle}`}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: `${mem.avatar_color}22`, color: '#cfc8e8' }}
                      >
                        {mem.display_name}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Friend allowance — choose how deep and in what context */}
      <Section title={t('Who can see your chart')}>
        <div className="flex gap-2 mb-2">
          <input
            value={grantHandle}
            onChange={(e) => setGrantHandle(e.target.value)}
            placeholder={t('@handle to share with')}
            className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => grantHandle.trim() && grant(grantHandle.trim())}
            disabled={pending || !grantHandle.trim()}
            className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-50"
          >
            {t('Share')}
          </button>
        </div>
        <div className="flex gap-2 mb-1 items-center flex-wrap">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setGrantLevel(l)}
              className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                grantLevel === l ? 'bg-[#9a8fe0]/25 border-[#9a8fe0]/60 text-[#cfc8e8]' : 'border-[#242a3b] text-[#5b5e72]'
              }`}
            >
              {t(LEVEL_LABEL[l])}
            </button>
          ))}
          <select
            value={grantContext}
            onChange={(e) => setGrantContext(e.target.value)}
            className="text-xs bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-2 py-1 text-[#9698a8]"
          >
            {CONTEXTS.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        </div>
        <p className="text-[10px] text-[#5b5e72] mb-3">
          {t('light = the essentials · standard = full chart · deep = patterns, shadow work & all traditions · open heart = full transparency')}
        </p>
        {allowances.length === 0 ? (
          <Empty>{t("You haven't shared your chart with anyone yet.")}</Empty>
        ) : (
          allowances.map((a) => (
            <Row key={a.handle}>
              <span>
                {a.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{a.handle}</span>{' '}
                <span className="text-[10px] uppercase tracking-wide text-[#b6abec]">
                  {t(LEVEL_LABEL[a.level] ?? a.level)} · {t(a.context)}
                </span>
              </span>
              <span className="flex gap-2 items-center">
                <select
                  value={a.level}
                  onChange={(e) => grant(a.handle, e.target.value, a.context)}
                  disabled={pending}
                  className="text-[10px] bg-[#0d0f1a] border border-[#242a3b] rounded px-1 py-0.5 text-[#9698a8]"
                >
                  {LEVELS.map((l) => <option key={l} value={l}>{t(LEVEL_LABEL[l])}</option>)}
                </select>
                <button onClick={() => revoke(a.handle)} disabled={pending} className="text-xs text-[#d9663c]">
                  {t('revoke')}
                </button>
              </span>
            </Row>
          ))
        )}
      </Section>

      {/* Consent transparency — who is actually reading you */}
      <Section title={t("Who's been reading you")}>
        {audience.length === 0 ? (
          <Empty>{t("No one has opened your chart yet. When they do, you'll see it here.")}</Empty>
        ) : (
          audience.map((v) => (
            <Row key={v.handle}>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.avatar_color ?? '#5b5e72' }} />
                {v.display_name ?? t('Someone')}{' '}
                <span className="text-[#5b5e72] font-mono text-xs">@{v.handle ?? '?'}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                {v.reads} {v.reads === 1 ? t('read') : t('reads')} · {t('last')} {new Date(v.last_read).toLocaleDateString()}
              </span>
            </Row>
          ))
        )}
      </Section>

      {/* Incoming requests */}
      <Section title={t('Requests to see your chart')}>
        {pendingReqs.length === 0 ? (
          <Empty>{t('No pending requests.')}</Empty>
        ) : (
          pendingReqs.map((r) => (
            <Row key={r.handle}>
              <span>{r.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{r.handle}</span> {t('wants access')}</span>
              <button onClick={() => grant(r.handle)} disabled={pending} className="af-btn af-btn-primary af-btn-sm">
                {t('Allow')}
              </button>
            </Row>
          ))
        )}
      </Section>

      {/* Souls you've charted — keep them, send links, weave them in */}
      <ChartedSouls souls={souls} myMaps={ownedMaps} />

      {/* Friends — find people by handle, accept requests, weave bonds */}
      <Section title={t('Friends')}>
        <div className="mb-4">
          <FindFriends />
        </div>
        <div className="mb-3 pt-3 border-t border-white/5">
          <BondInvite />
          <p className="text-[10px] text-[#5b5e72] mt-1.5">
            {t("Your personal astrobond link: they log in once with their FBID, create their chart, and you see each other's skies — in dashboards, constellations, and every universe you weave together.")}
          </p>
        </div>
        {friends.length === 0 ? (
          <Empty>{t('No bonds yet — send your link and watch your sky fill up.')}</Empty>
        ) : (
          friends.map((f) => (
            <Row key={f.handle}>
              <span>{f.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{f.handle}</span></span>
              {confirmErase === f.handle ? (
                <span className="flex gap-2 items-center text-[10px]">
                  <span className="text-[#d9663c]">{t("erase this bond? it's mutual")}</span>
                  <button
                    onClick={() => { setConfirmErase(''); eraseBond(f.handle); }}
                    disabled={pending}
                    className="uppercase tracking-wide bg-[#d9663c]/20 border border-[#d9663c]/50 text-[#e98b63] rounded-full px-2.5 py-0.5"
                  >
                    {t('erase')}
                  </button>
                  <button onClick={() => setConfirmErase('')} className="text-[#5b5e72]">{t('keep')}</button>
                </span>
              ) : (
                <span className="flex gap-3 items-center">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">{f.status}</span>
                  <button
                    onClick={() => setConfirmErase(f.handle)}
                    disabled={pending}
                    className="text-[10px] text-[#d9663c]/60 hover:text-[#d9663c]"
                  >
                    {t('erase bond')}
                  </button>
                </span>
              )}
            </Row>
          ))
        )}
        <p className="text-[10px] text-[#5b5e72] mt-2">
          {t("Erasing a bond is mutual and clean: you both leave each other's dashboards and constellations, shared skies close, and reconnecting takes a fresh request you approve. No drama, no surveillance — just free flow.")}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 pt-4 border-t border-white/5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#b6abec] mb-3">{title}</div>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between py-1.5 text-sm text-[#cfc8e8]">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#9698a8]">{children}</p>;
}
