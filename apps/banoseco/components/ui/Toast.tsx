'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/components/providers/GameProvider';

export function Toast() {
  const { toastMsg } = useGame();
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState<{ text: string; kind?: string } | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    setShown({ text: toastMsg.text, kind: toastMsg.kind });
    setOn(true);
    const t = setTimeout(() => setOn(false), 2300);
    return () => clearTimeout(t);
  }, [toastMsg]);

  if (!shown) return null;
  return (
    <div className={`toast${on ? ' on' : ''}${shown.kind ? ' ' + shown.kind : ''}`} role="status" aria-live="polite">
      {shown.text}
    </div>
  );
}
