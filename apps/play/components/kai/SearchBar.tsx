'use client';
// SearchBar — global command/search entry. Wired to a places/missions index later;
// for now it's a focus-ready control (⌘K / "/") so the interaction exists.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function SearchBar({ placeholder = 'Search places, missions, dreams…' }: { placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [v, setV] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== ref.current) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-3.5 py-2 backdrop-blur-md transition-colors focus-within:border-kai-gold/40">
      <Icon name="search" size={16} className="text-kai-faint group-focus-within:text-kai-gold" />
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-kai-text placeholder:text-kai-faint focus:outline-none"
      />
      <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-kai-faint sm:block">/</kbd>
    </div>
  );
}
