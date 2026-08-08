import { useState } from 'react';

/**
 * Guest invite. A guest brings in her own counsel without talking to anyone,
 * and whoever she brings lands as a `viewer` who cannot invite further.
 * Capped at 10 per room, enforced in the RPC.
 */
export default function InvitePanel({
  onInvite,
}: {
  onInvite: (email: string, note?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      await onInvite(email.trim().toLowerCase(), note.trim() || undefined);
      setState('done');
      setEmail('');
      setNote('');
      setTimeout(() => {
        setState('idle');
        setOpen(false);
      }, 2600);
    } catch {
      setState('error');
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open ? (
        <div
          className="p-6"
          style={{
            width: 'min(22rem, calc(100vw - 2.5rem))',
            background: 'var(--ink)',
            border: '1px solid var(--hair)',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="t-tag" style={{ color: 'var(--gold)' }}>Bring someone in</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="t-mono text-white/60 hover:text-white"
            >
              Close
            </button>
          </div>

          {state === 'done' ? (
            <p className="t-body">
              Sent. They’ll get the same link and land straight in the room.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="their@email.com"
                className="w-full rounded-sm border border-[color:var(--hair)] bg-black/25 px-3.5 py-2.5
                           text-[0.94rem] text-white placeholder:text-white/40 focus:border-[color:var(--gold)] focus:outline-none"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="A line of context (optional)"
                className="w-full rounded-sm border border-[color:var(--hair)] bg-black/25 px-3.5 py-2.5
                           text-[0.94rem] text-white placeholder:text-white/40 focus:border-[color:var(--gold)] focus:outline-none"
              />
              {state === 'error' && (
                <p role="alert" className="text-[0.82rem] text-[color:var(--rose)]">
                  That didn’t send. Check the address and try again.
                </p>
              )}
              <button
                type="submit"
                disabled={state === 'busy'}
                className="t-tag w-full px-4 py-2.5 transition-opacity disabled:opacity-40"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                {state === 'busy' ? 'Sending…' : 'Send invitation'}
              </button>
              <p className="t-mono leading-relaxed text-white/55">
                They can read and annotate. They cannot invite anyone else.
              </p>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="t-tag px-5 py-3 transition-opacity hover:opacity-85"
          style={{ background: 'var(--gold)', color: 'var(--ink)' }}
        >
          + Invite
        </button>
      )}
    </div>
  );
}
