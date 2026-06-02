'use client';
import { useEffect, useRef, useState } from 'react';
import tzlookup from 'tz-lookup';

export interface PlaceResult {
  place: string; // human label
  lat: number; // north-positive
  lng: number; // EAST-positive (western hemisphere negative) — what the engine expects
  tz: string; // IANA timezone, resolved offline from lat/lng
}

interface Candidate {
  id: number;
  label: string;
  lat: number;
  lng: number;
}

/**
 * Birthplace autocomplete backed by OpenStreetMap Nominatim (via /api/geocode —
 * no API key). On select it resolves the timezone offline via tz-lookup, so a
 * single pick fills place + lat + lng + tz. Longitude is east-positive, the
 * convention the astro engine expects.
 */
export default function PlaceAutocomplete({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (r: PlaceResult) => void;
}) {
  const [q, setQ] = useState(value);
  const [results, setResults] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked || q.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, picked]);

  function pick(c: Candidate) {
    let tz = '';
    try {
      tz = tzlookup(c.lat, c.lng);
    } catch {
      tz = '';
    }
    setQ(c.label);
    setPicked(true);
    setOpen(false);
    onSelect({ place: c.label, lat: c.lat, lng: c.lng, tz });
  }

  const input =
    'w-full bg-[#11131f] border border-[#242a3b] rounded-lg px-3 py-2 text-[#ece9e0] text-sm';

  return (
    <div className="relative">
      <input
        className={input}
        placeholder="Start typing a city…"
        value={q}
        onChange={(e) => {
          setPicked(false);
          setQ(e.target.value);
        }}
        onFocus={() => results.length && setOpen(true)}
        autoComplete="off"
      />
      {loading && <span className="absolute right-3 top-2.5 text-[10px] text-[#5b5e72]">…</span>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-[#11131f] border border-[#242a3b] rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[#ece9e0] hover:bg-[#9a8fe0]/15"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
