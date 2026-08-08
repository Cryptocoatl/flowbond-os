/**
 * Seed a room from its content file.
 *
 *   export SUPABASE_SERVICE_ROLE_KEY=$(claudia keys get flowme SUPABASE_SERVICE_ROLE_KEY)
 *   export SEED_OWNER_EMAIL=... SEED_GUEST_EMAIL=...
 *   pnpm seed:room 1mwd
 *
 * Idempotent: blocks upsert on (room_id, block_key), so re-running after a copy
 * edit updates the text and leaves every mark and comment attached. That is the
 * whole reason block keys are permanent.
 */
import room1mwd from '../src/content/rooms/1mwd';
import type { RoomContent } from '../src/content/types';

const ROOMS: Record<string, RoomContent> = { '1mwd': room1mwd };

const URL_BASE = process.env.SUPABASE_URL ?? 'https://fgsrcxxccdjqyrpkitmk.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER = process.env.SEED_OWNER_EMAIL;
const GUEST = process.env.SEED_GUEST_EMAIL;

if (!KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
if (!OWNER) throw new Error('SEED_OWNER_EMAIL is required');

const ALPHABET = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';

/** nanoid(22): unguessable, but never the security boundary. */
function slugId(size = 22) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY!,
      authorization: `Bearer ${KEY}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function main() {
  const name = process.argv[2];
  const content = ROOMS[name];
  if (!content) throw new Error(`Unknown room "${name}". Known: ${Object.keys(ROOMS).join(', ')}`);

  // The owner must already exist as a FlowBond user — that is the FBID.
  const owners = await api<{ id: string }[]>(
    `flowbond_users?email=eq.${encodeURIComponent(OWNER!)}&select=id`,
  );
  if (!owners.length) {
    throw new Error(`No flowbond_users row for ${OWNER}. Sign in once anywhere in FlowBond first.`);
  }
  const ownerId = owners[0].id;

  // Reuse an existing room for this title so re-seeding never orphans marks.
  const existing = await api<{ id: string; slug: string }[]>(
    `flowroom_rooms?title=eq.${encodeURIComponent(content.title)}&select=id,slug`,
  );

  let roomId: string;
  let slug: string;

  if (existing.length) {
    roomId = existing[0].id;
    slug = existing[0].slug;
    await api(`flowroom_rooms?id=eq.${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify({ theme: content.theme, client_name: content.clientName }),
    });
    console.log(`↻ reusing room ${slug}`);
  } else {
    slug = slugId();
    const [room] = await api<{ id: string }[]>('flowroom_rooms', {
      method: 'POST',
      body: JSON.stringify({
        slug,
        title: content.title,
        client_name: content.clientName,
        theme: content.theme,
        status: 'live',
        owner_user_id: ownerId,
        published_at: new Date().toISOString(),
      }),
    });
    roomId = room.id;
    console.log(`+ created room ${slug}`);
  }

  // Members. Email uniqueness is enforced by a *functional* index on
  // lower(email) — PostgREST upsert can't target that, so insert only what is
  // missing rather than pretending it can.
  const want: Record<string, unknown>[] = [
    { room_id: roomId, email: OWNER!.toLowerCase(), user_id: ownerId, role: 'owner' },
  ];
  if (GUEST) want.push({ room_id: roomId, email: GUEST.toLowerCase(), role: 'guest' });

  const have = await api<{ email: string }[]>(`flowroom_members?room_id=eq.${roomId}&select=email`);
  const known = new Set(have.map((m) => m.email.toLowerCase()));
  const missing = want.filter((m) => !known.has(String(m.email)));

  if (missing.length) {
    await api('flowroom_members', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(missing),
    });
    console.log(`+ ${missing.length} member(s)`);
  }

  // Blocks. The whole typed block is the payload, so the renderer needs no
  // second source of truth and room #2 stays a content file.
  const rows = content.blocks.map((b, i) => ({
    room_id: roomId,
    section_key: b.section,
    block_key: b.key,
    ordinal: i,
    kind: b.kind,
    payload: b,
    annotatable: b.annotatable !== false,
  }));

  await api('flowroom_blocks?on_conflict=room_id,block_key', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });

  const annotatable = rows.filter((r) => r.annotatable).length;
  console.log(`✓ ${rows.length} blocks (${annotatable} annotatable)`);
  console.log(`\n   https://1mwd.danz.now/r/${slug}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
