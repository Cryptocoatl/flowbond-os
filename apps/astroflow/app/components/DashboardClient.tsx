'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase';

interface Me {
  handle: string;
  display_name: string;
  visibility: string;
}
interface Member {
  handle: string;
  display_name: string;
  avatar_color: string;
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
}: {
  me: Me | null;
  maps: FlowMap[];
  requests: ReqRow[];
  allowances: Person[];
  friends: Friend[];
  crews: Crew[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [grantHandle, setGrantHandle] = useState('');
  const [crewName, setCrewName] = useState('');
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');
  const sb = browserClient();

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://astro.flowbond.life';
  const inviteUrl = (code: string) => `${origin}/join/${code}`;

  function createCrew() {
    if (!crewName.trim()) return;
    setMsg('');
    start(async () => {
      const { error } = await sb.rpc('create_crew', { crew_name: crewName.trim() });
      setMsg(error ? error.message : `Crew "${crewName}" created`);
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

  const grant = (h: string) =>
    act(async () => await sb.rpc('grant_access', { target_handle: h.replace(/^@/, '') }), `Allowed @${h}`);
  const revoke = (h: string) =>
    act(async () => await sb.rpc('revoke_access', { target_handle: h }), `Revoked @${h}`);

  const pendingReqs = requests.filter((r) => r.status === 'pending');

  return (
    <div className="max-w-3xl mx-auto p-6 text-[#ece9e0]">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">Your AstroFlow</h1>
          {me ? (
            <p className="text-xs font-mono text-[#5b5e72]">@{me.handle} · {me.visibility}</p>
          ) : (
            <p className="text-sm text-[#9698a8]">You don&apos;t have a chart yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#242a3b] text-[#9698a8]">
            Constellation
          </Link>
          <Link href="/profile/new" className="text-xs uppercase tracking-wider px-4 py-1.5 rounded-full bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec]">
            {me ? 'Edit chart' : '+ Add chart'}
          </Link>
        </div>
      </header>

      {msg && <p className="text-sm text-[#7fd1a8] mb-4">{msg}</p>}

      {/* Crews — invite people, share charts across the group */}
      <Section title="Your crews">
        <div className="flex gap-2 mb-3">
          <input
            value={crewName}
            onChange={(e) => setCrewName(e.target.value)}
            placeholder="Name a crew (e.g. Tulum crew)"
            className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={createCrew}
            disabled={pending || !crewName.trim()}
            className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-50"
          >
            Create
          </button>
        </div>
        {crews.length === 0 ? (
          <Empty>No crews yet. Create one, share the invite link, and your people join with one tap.</Empty>
        ) : (
          <div className="space-y-3">
            {crews.map((c) => (
              <div key={c.id} className="border border-[#242a3b] rounded-xl p-4 bg-[#11131f]">
                <div className="flex items-center justify-between">
                  <div className="font-serif text-lg">{c.name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                    {(c.members ?? []).length} {(c.members ?? []).length === 1 ? 'member' : 'members'}
                    {c.is_owner ? ' · host' : ''}
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
                    {copied === c.invite_code ? 'Copied ✓' : 'Copy invite'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Collective charts */}
      <Section title="Your collective charts">
        {maps.length === 0 ? (
          <Empty>
            No flow maps yet. In the constellation, switch to <b>Combine</b>, weave people together, and
            save them as a flow map.
          </Empty>
        ) : (
          <div className="space-y-3">
            {maps.map((m) => (
              <div key={m.id} className="border border-[#242a3b] rounded-xl p-4 bg-[#11131f]">
                <div className="flex items-center justify-between">
                  <div className="font-serif text-lg">{m.name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">
                    {m.context}{m.is_owner ? '' : ' · added by a friend'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(m.members ?? []).map((mem) => (
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
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Friend allowance */}
      <Section title="Who can see your chart">
        <div className="flex gap-2 mb-3">
          <input
            value={grantHandle}
            onChange={(e) => setGrantHandle(e.target.value)}
            placeholder="@handle to allow"
            className="flex-1 bg-[#0d0f1a] border border-[#242a3b] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => grantHandle.trim() && grant(grantHandle.trim())}
            disabled={pending || !grantHandle.trim()}
            className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-50"
          >
            Allow
          </button>
        </div>
        {allowances.length === 0 ? (
          <Empty>You haven&apos;t granted anyone access yet.</Empty>
        ) : (
          allowances.map((a) => (
            <Row key={a.handle}>
              <span>{a.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{a.handle}</span></span>
              <button onClick={() => revoke(a.handle)} disabled={pending} className="text-xs text-[#d9663c]">
                revoke
              </button>
            </Row>
          ))
        )}
      </Section>

      {/* Incoming requests */}
      <Section title="Requests to see your chart">
        {pendingReqs.length === 0 ? (
          <Empty>No pending requests.</Empty>
        ) : (
          pendingReqs.map((r) => (
            <Row key={r.handle}>
              <span>{r.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{r.handle}</span> wants access</span>
              <button
                onClick={() => grant(r.handle)}
                disabled={pending}
                className="text-xs bg-[#9a8fe0]/20 border border-[#9a8fe0]/50 text-[#cfc8e8] rounded-full px-3 py-1"
              >
                Allow
              </button>
            </Row>
          ))
        )}
      </Section>

      {/* Friends */}
      {friends.length > 0 && (
        <Section title="Friends">
          {friends.map((f) => (
            <Row key={f.handle}>
              <span>{f.display_name} <span className="text-[#5b5e72] font-mono text-xs">@{f.handle}</span></span>
              <span className="text-[10px] uppercase tracking-wider text-[#5b5e72]">{f.status}</span>
            </Row>
          ))}
        </Section>
      )}
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
