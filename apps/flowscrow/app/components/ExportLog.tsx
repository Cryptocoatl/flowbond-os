'use client';

import type { FlowEvent } from '@/lib/types';

export function ExportLog({ dealTitle, events }: { dealTitle: string; events: FlowEvent[] }) {
  function download() {
    const blob = new Blob(
      [JSON.stringify({ deal: dealTitle, exported_at: new Date().toISOString(), events }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowscrow-audit-log.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button className="btn btn-ghost" onClick={download}>
      Export audit log
    </button>
  );
}
