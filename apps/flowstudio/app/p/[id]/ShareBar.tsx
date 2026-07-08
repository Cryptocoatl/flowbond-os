'use client';
import { useState } from 'react';

// Native share where available (mobile), copy-link fallback everywhere else.
export default function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button onClick={share}
      className="rounded-xl border px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5"
      style={{ borderColor: 'var(--border)' }}>
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
