// Lucide-style line icons (24x24, currentColor). No emoji-as-icon.
import type { CSSProperties, ReactNode } from 'react';
type P = { className?: string; style?: CSSProperties };

function Svg({ className = 'w-5 h-5', style, children }: P & { children: ReactNode }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const Clapper = (p: P) => (<Svg {...p}><path d="M3 8l18-3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 8l4.5-1M9 6.5L13.5 5.6M15 5l4.5-1" /></Svg>);
export const Plus = (p: P) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const Film = (p: P) => (<Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></Svg>);
export const Music = (p: P) => (<Svg {...p}><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></Svg>);
export const Sparkles = (p: P) => (<Svg {...p}><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 14l.7 1.8L21.5 16.5 19.7 17.2 19 19l-.7-1.8L16.5 16.5l1.8-.7z" /></Svg>);
export const Shield = (p: P) => (<Svg {...p}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></Svg>);
export const Play = (p: P) => (<Svg {...p}><path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" /></Svg>);
export const Branch = (p: P) => (<Svg {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="8" r="2.5" /><path d="M6 8.5v7M6 15c0-4 12-3 12-7" /></Svg>);
export const Wand = (p: P) => (<Svg {...p}><path d="M15 5l4 4M6 21l11-11M14 6l4 4" /><path d="M5 7l1-2 2-1-2-1-1-2-1 2-2 1 2 1z" /></Svg>);
export const Clock = (p: P) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);
export const ArrowLeft = (p: P) => (<Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>);
export const Trash = (p: P) => (<Svg {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></Svg>);
