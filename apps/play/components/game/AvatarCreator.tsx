'use client';
// AvatarCreator — pick your Kai. Self-hosted animated presets (reliable). Custom
// Ready Player Me creation slots in here once an RPM app subdomain is configured.
import { AVATARS } from '@/lib/kai/avatars';

export function AvatarCreator({ onCreated, onClose }: { onCreated: (url: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg animate-fade-up p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-kai-text">Elige tu Kai</h2>
          <button onClick={onClose} className="rounded-full border border-white/15 px-3 py-1 text-sm text-kai-muted">
            Cerrar ✕
          </button>
        </div>
        <p className="mb-4 text-[13px] text-kai-muted">Tu avatar para todos los mundos. Elige uno para empezar.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => onCreated(a.url)}
              className="glass-hover group flex flex-col items-center gap-2 rounded-xl2 border border-white/[0.06] bg-white/[0.02] p-4 text-center"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-kai-gold/10 text-3xl">
                {a.emoji}
              </span>
              <div>
                <div className="text-sm font-medium text-kai-text">{a.name}</div>
                <div className="text-[11px] text-kai-muted">{a.role}</div>
              </div>
              <span className="mt-1 rounded-full border border-kai-gold/30 bg-kai-gold/10 px-3 py-1 text-[11px] font-medium text-kai-gold">
                Elegir
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-kai-faint">
          Pronto: creador de avatar personalizado (Ready Player Me).
        </p>
      </div>
    </div>
  );
}
