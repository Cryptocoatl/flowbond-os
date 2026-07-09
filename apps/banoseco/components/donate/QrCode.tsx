'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Real QR (lib `qrcode`) rendered as a data-URL image, palette-matched. */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#08130f', light: '#eaf4ee' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div className="qr">
      {src ? <img src={src} alt="Código QR de donación" width={size} height={size} /> : null}
    </div>
  );
}
