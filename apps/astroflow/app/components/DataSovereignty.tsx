'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { browserClient } from '../../lib/supabase';
import { useT } from '../../lib/i18n/provider';

// Identity & data sovereignty hub — one calm, clear place where anyone can see
// exactly who they're weaved with, who can see their chart, who's been reading
// them, the constellations they're in, and erase any of it (up to their whole
// account). FlowBond's promise made visible: your data is yours to govern.

interface Friend { handle: string; display_name: string }
interface Allowance { handle: string; display_name: string; level: string; context: string }
interface Audience { handle: string; display_name: string; reads: number; last_read: string | null }
interface MapRow { id: string; name: string; context: string; is_owner: boolean; member_count: number }
interface Me { handle: string; display_name: string; visibility: string }

const VIS: { v: string; label: string; help: string }[] = [
  { v: 'private', label: 'Only me', help: 'No one else can see your chart.' },
  { v: 'specific', label: 'Specific people', help: 'Only people you explicitly grant.' },
  { v: 'friends', label: 'Accepted bonds', help: 'Anyone you’ve bonded with.' },
  { v: 'public', label: 'Everyone on AstralFlow', help: 'Anyone can find and read your chart.' },
];

export default function DataSovereignty({
  me, friends, allowances, audience, maps,
}: {
  me: Me; friends: Friend[]; allowances: Allowance[]; audience: Audience[]; maps: MapRow[];
}) {
  const t = useT();
  const router = useRouter();
  const sb = browserClient();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState('');

  function run(fn: () => PromiseLike<{ error: any }>, ok: string) {
    setMsg('');
    start(async () => {
      const { error } = await fn();
      setMsg(error ? error.message : ok);
      if (!error) router.refresh();
    });
  }

  const setVisibility = (v: string) =>
    run(() => sb.rpc('set_my_visibility', { v }), t('Visibility updated'));
  const eraseBond = (h: string) =>
    run(() => sb.rpc('erase_bond', { peer_handle: h }), t('Bond with @{handle} erased', { handle: h }));
  const revoke = (h: string) =>
    run(() => sb.rpc('revoke_access', { target_handle: h }), t('Stopped sharing with @{handle}', { handle: h }));
  const leaveMap = (id: string) =>
    run(() => sb.rpc('leave_flow_map', { p_map_id: id }), t('You left the constellation'));
  const deleteMap = (id: string) =>
    run(() => sb.rpc('delete_flow_map', { p_map_id: id }), t('Constellation deleted'));

  async function deleteAccount() {
    setBusy('account');
    const { error } = await sb.rpc('delete_my_astroflow_account');
    if (error) { setMsg(error.message); setBusy(''); return; }
    await sb.auth.signOut().catch(() => {});
    window.location.assign('/');
  }

  return (
    <div className="space-y-7">
      {msg && <p className="text-sm text-[#7fd1a8]">{msg}</p>}

      {/* sovereignty intro */}
      <div className="rounded-2xl border border-[#9a8fe0]/25 bg-[#9a8fe0]/[0.06] p-4">
        <p className="text-sm text-[#cfc8e8] leading-relaxed">
          {t('Your chart, your bonds, your data — all yours. This is where you see exactly who you’re weaved with and who can see you, and change or erase any of it. Nothing here is hidden from you, and no one can manage it but you. That’s FlowBond identity sovereignty.')}
        </p>
      </div>

      {/* visibility */}
      <Section title={t('Who can see your chart by default')}>
        <div className="grid sm:grid-cols-2 gap-2">
          {VIS.map((o) => (
            <button
              key={o.v}
              onClick={() => setVisibility(o.v)}
              disabled={pending}
              className={`text-left rounded-xl border p-3 transition ${
                me.visibility === o.v ? 'border-[#e3c07a] bg-[#e3c07a]/[0.08]' : 'border-[#242a3b] hover:border-[#3a4670]'
              }`}
            >
              <div className="text-sm text-[#ece9e0] flex items-center gap-2">
                {t(o.label)} {me.visibility === o.v && <span className="text-[#e3c07a] text-xs">✓</span>}
              </div>
              <div className="text-[11px] text-[#9698a8] mt-0.5">{t(o.help)}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* who you're weaved with */}
      <Section title={t('Who you’re weaved with')} count={friends.length}>
        {friends.length === 0 ? (
          <Empty>{t('No bonds yet. Share your bond link to weave with someone.')}</Empty>
        ) : (
          friends.map((f) => (
            <Row key={f.handle}>
              <Link href={`/chart/${f.handle}`} className="min-w-0">
                <span className="text-sm text-[#ece9e0]">{f.display_name}</span>
                <span className="text-xs text-[#5b5e72] ml-2">@{f.handle}</span>
              </Link>
              <Danger onClick={() => eraseBond(f.handle)} disabled={pending}>{t('Erase bond')}</Danger>
            </Row>
          ))
        )}
      </Section>

      {/* who can see your chart */}
      <Section title={t('People you let see your chart')} count={allowances.length}>
        {allowances.length === 0 ? (
          <Empty>{t('You haven’t granted anyone direct access.')}</Empty>
        ) : (
          allowances.map((a) => (
            <Row key={a.handle}>
              <div className="min-w-0">
                <span className="text-sm text-[#ece9e0]">{a.display_name}</span>
                <span className="text-xs text-[#5b5e72] ml-2">@{a.handle} · {a.level} · {a.context}</span>
              </div>
              <Danger onClick={() => revoke(a.handle)} disabled={pending}>{t('Revoke')}</Danger>
            </Row>
          ))
        )}
      </Section>

      {/* who reads you */}
      <Section title={t('Who’s been reading you')} count={audience.length}>
        {audience.length === 0 ? (
          <Empty>{t('No one has read your chart yet.')}</Empty>
        ) : (
          audience.map((a) => (
            <Row key={a.handle}>
              <div className="min-w-0">
                <span className="text-sm text-[#ece9e0]">{a.display_name}</span>
                <span className="text-xs text-[#5b5e72] ml-2">@{a.handle}</span>
              </div>
              <span className="text-xs text-[#9698a8]">{t('{n} reads', { n: a.reads })}</span>
            </Row>
          ))
        )}
      </Section>

      {/* constellations */}
      <Section title={t('Constellations you’re in')} count={maps.length}>
        {maps.length === 0 ? (
          <Empty>{t('You’re not in any constellations yet.')}</Empty>
        ) : (
          maps.map((m) => (
            <Row key={m.id}>
              <Link href={`/map/${m.id}`} className="min-w-0">
                <span className="text-sm text-[#ece9e0]">{m.name}</span>
                <span className="text-xs text-[#5b5e72] ml-2">{m.context} · {t('{n} people', { n: m.member_count })}{m.is_owner ? ` · ${t('host')}` : ''}</span>
              </Link>
              {m.is_owner ? (
                <Danger onClick={() => deleteMap(m.id)} disabled={pending}>{t('Delete')}</Danger>
              ) : (
                <Danger onClick={() => leaveMap(m.id)} disabled={pending}>{t('Leave')}</Danger>
              )}
            </Row>
          ))
        )}
      </Section>

      {/* danger zone — account deletion */}
      <div className="rounded-2xl border border-[#d9663c]/40 bg-[#d9663c]/[0.06] p-4 mt-2">
        <h3 className="text-sm font-semibold text-[#e8956a]">{t('Erase my AstroFlow account')}</h3>
        <p className="text-xs text-[#cfc8e8] mt-1.5 leading-relaxed">
          {t('This permanently deletes your chart, bonds, shares, constellations and everything AstroFlow holds about you. It cannot be undone. (Your FlowBond login for other apps stays — this only erases AstroFlow.)')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t('Type DELETE to confirm')}
            className="af-input flex-1"
            autoCapitalize="characters"
          />
          <button
            onClick={deleteAccount}
            disabled={confirmText.trim().toUpperCase() !== 'DELETE' || busy === 'account'}
            className="af-btn af-btn-danger disabled:opacity-40"
          >
            {busy === 'account' ? t('Erasing…') : t('Erase everything')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#b6abec]">{title}</h2>
        {count != null && count > 0 && <span className="text-[10px] text-[#5b5e72]">· {count}</span>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-[#242a3b] bg-[#11131f] px-3.5 py-2.5">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#5b5e72]">{children}</p>;
}
function Danger({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="text-xs text-[#d9663c] hover:text-[#e8956a] disabled:opacity-50 shrink-0 active:scale-95 transition">
      {children}
    </button>
  );
}
