'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PartyRole, Task } from '@/lib/types';
import { canConfirm, canSubmit, taskStatusColor } from '@/lib/ui';
import { apiUrl } from '@/lib/path';

const PHASES: { key: 'A' | 'B' | 'C'; label: string }[] = [
  { key: 'A', label: 'Phase A — Execution & escrow' },
  { key: 'B', label: 'Phase B — Transfers (gated)' },
  { key: 'C', label: 'Phase C — Verify, release, anchor' },
];

export function TaskTracker({ tasks, myRoles }: { tasks: Task[]; myRoles: PartyRole[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {PHASES.map((ph) => {
        const rows = tasks.filter((t) => t.phase === ph.key);
        const done = rows.filter((t) => t.status === 'confirmed').length;
        return (
          <div key={ph.key} className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{ph.label}</h3>
              <span className="gold" style={{ fontSize: 13, fontWeight: 700 }}>
                {done}/{rows.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((t) => (
                <TaskRow key={t.id} task={t} myRoles={myRoles} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ task, myRoles }: { task: Task; myRoles: PartyRole[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const showSubmit = canSubmit(task.status, task.responsible_role, myRoles);
  const showConfirm = canConfirm(task.status, task.verifier_role, myRoles);

  async function act(endpoint: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'failed');
      return;
    }
    router.refresh();
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '10px 0',
        borderTop: '1px solid rgba(201,169,97,0.10)',
      }}
    >
      <span
        title={task.status}
        style={{
          marginTop: 5,
          width: 10,
          height: 10,
          borderRadius: 999,
          flexShrink: 0,
          background: taskStatusColor(task.status),
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span className="gold" style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {task.code}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</span>
          <span style={{ fontSize: 11, color: '#8a978c' }}>
            {task.responsible_label} → {task.verifier_label}
          </span>
        </div>
        {task.acceptance_criteria && (
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
            {task.acceptance_criteria}
          </p>
        )}
        {err && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d98c7a' }}>{err}</p>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {task.status === 'confirmed' && (
          <span className="pill" style={{ color: '#8FA98F' }}>
            confirmed
          </span>
        )}
        {task.status === 'submitted' && !showConfirm && (
          <span className="pill" style={{ color: '#C9A961' }}>
            awaiting {task.verifier_label}
          </span>
        )}
        {showSubmit && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => act('/api/tasks/submit')}>
            Mark delivered
          </button>
        )}
        {showConfirm && (
          <button className="btn btn-gold" disabled={busy} onClick={() => act('/api/tasks/confirm')}>
            Confirm
          </button>
        )}
      </div>
    </div>
  );
}
