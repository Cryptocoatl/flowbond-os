'use client';

import { useState } from 'react';
import { logOpenflow } from '@/lib/openflow/analytics';

export default function GiftAct({ pdfUrl, onClosing }: { pdfUrl: string; onClosing: () => void }) {
  const [released, setReleased] = useState(false);

  const onDownload = () => {
    logOpenflow('pdf_downloaded');
    setReleased(true);
    // let the bloom play, then carry Jeff into the closing
    setTimeout(onClosing, 1800);
  };

  return (
    <div className={`of-act${released ? ' of-gift--released' : ''}`}>
      <div className="of-aurora" style={{ opacity: 0.35 }} />
      <div className="of-center" style={{ position: 'relative', zIndex: 1 }}>
        <div className="of-bookscene" aria-hidden="true">
          <div className="of-book3d">
            <div className="of-bookspine" />
            <div className="of-bookface back" />
            <div className="of-bookface front">
              <div className="of-seal">
                <span>◈</span>
              </div>
              <div className="of-booktitle">
                OpenFlow
                <br />
                The Open Book
              </div>
            </div>
          </div>
        </div>

        <p className="of-typed of-fade-up" style={{ fontSize: 'clamp(17px,2.4vw,21px)', fontStyle: 'italic' }}>
          Let’s make it easy — the whole Open Book in one PDF, ready to load into your stack.
        </p>

        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <a className="of-btn" href={pdfUrl} download="FlowBond-OpenFlow.pdf" onClick={onDownload}>
            Download the OpenFlow PDF
          </a>
          <button className="of-btn of-btn--ghost" onClick={onClosing} style={{ fontSize: 12, padding: '9px 22px' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
