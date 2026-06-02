'use client';
import { useState } from 'react';
import { browserClient } from '../../lib/supabase';

export default function RequestAccess({ handle }: { handle: string }) {
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  async function request() {
    const sb = browserClient();
    const { error } = await sb.schema('astroflow').rpc('request_access', { target_handle: handle });
    setState(error ? 'error' : 'sent');
  }
  if (state === 'sent') return <p className="text-[#7bd0c6] text-sm">Request sent to @{handle}. They can grant you access.</p>;
  return (
    <button onClick={request} className="text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2">
      Request access from @{handle}
    </button>
  );
}
