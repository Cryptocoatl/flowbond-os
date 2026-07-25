'use client';
// AvatarPanel — dashboard identity block. Shows the player's RPM avatar (live 3D
// if created, gradient placeholder otherwise) + create/change entry.
import { useState } from 'react';
import { useAvatar } from './useAvatar';
import { AvatarCreator } from './AvatarCreator';
import { AvatarPreview } from './AvatarPreview';
import { DEFAULT_AVATAR } from '@/lib/kai/avatars';

export function AvatarPanel() {
  const { url, save } = useAvatar();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
        <AvatarPreview url={url ?? DEFAULT_AVATAR.url} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-kai-text">Kai Explorer</div>
        <div className="text-[11px] text-kai-muted">{url ? 'Your avatar · ready' : 'Default avatar'}</div>
        <button
          onClick={() => setOpen(true)}
          className="mt-1.5 rounded-full border border-kai-gold/30 bg-kai-gold/10 px-3 py-1 text-[11px] font-medium text-kai-gold transition-colors hover:bg-kai-gold/15"
        >
          {url ? 'Change avatar' : 'Create your avatar'}
        </button>
      </div>
      {open && (
        <AvatarCreator
          onCreated={(u) => {
            save(u);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
