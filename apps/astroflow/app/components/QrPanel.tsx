'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// A scannable QR for any invite link. Tap to reveal — your friend points their
// camera at it and lands straight on the invite (login → bond / join collective
// → their profile). Rendered as crisp dark-on-white SVG so any phone camera or
// scanner reads it reliably. Self-contained: pass a url, drop it anywhere.
export default function QrPanel({
  url,
  caption,
  label = 'Show QR code',
}: {
  url: string;
  caption?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!url) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="af-btn af-btn-ghost af-btn-sm"
      >
        {open ? 'Hide QR' : `⊞ ${label}`}
      </button>

      {open && (
        <div className="mt-3 flex flex-col items-center">
          <div className="bg-white p-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#0a0b12"
            />
          </div>
          <p className="text-[11px] text-[#b6abec] mt-2.5 text-center max-w-[15rem] leading-relaxed">
            {caption ?? 'Have your friend scan this with their camera to join.'}
          </p>
        </div>
      )}
    </div>
  );
}
