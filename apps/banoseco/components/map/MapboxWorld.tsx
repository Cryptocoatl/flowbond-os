'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { NearbyToilet } from '@/lib/types';
import { statusVisual, STATUS_COLOR } from '@/lib/status';
import { NODE_KIND_ICON, NODE_KIND_LABEL } from '@/lib/game';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

/** Solarpunk dark map. DOM/SVG markers (no default pins) coloured by status. */
export function MapboxWorld({
  toilets,
  player,
  selectedId,
  onSelect,
}: {
  toilets: NearbyToilet[];
  player: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init once
  useEffect(() => {
    if (!ref.current || map.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const center: [number, number] = player ? [player.lng, player.lat] : [-99.1615, 19.4096];
    map.current = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 13,
      attributionControl: false,
      cooperativeGestures: true,
    });
    map.current.on('load', () => {
      const m = map.current!;
      // tint the basemap toward the void/jade palette
      try {
        m.setPaintProperty('water', 'fill-color', '#0b2a26');
        m.setPaintProperty('land', 'background-color', '#08130f');
      } catch {
        /* style layer names vary; ignore */
      }
    });
    return () => {
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
  }, [player]);

  // player marker + recenter
  useEffect(() => {
    if (!map.current || !player) return;
    map.current.easeTo({ center: [player.lng, player.lat], duration: 600 });
  }, [player]);

  // sync toilet markers
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const live = new Set(toilets.map((t) => t.id));
    // remove stale
    markers.current.forEach((mk, id) => {
      if (!live.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    });
    // add / update
    toilets.forEach((t) => {
      const color = STATUS_COLOR[statusVisual(t.status)];
      const sel = t.id === selectedId;
      let mk = markers.current.get(t.id);
      const isToilet = t.node_kind === 'dry_toilet';
      if (!mk) {
        const el = document.createElement('button');
        el.className = 'bs-marker';
        el.setAttribute('aria-label', `${NODE_KIND_LABEL[t.node_kind]} · ${t.name}`);
        el.title = `${NODE_KIND_LABEL[t.node_kind]} · ${t.name}`;
        if (!isToilet) el.textContent = NODE_KIND_ICON[t.node_kind];
        el.addEventListener('click', () => onSelectRef.current(t.id));
        mk = new mapboxgl.Marker({ element: el }).setLngLat([t.lng, t.lat]).addTo(m);
        markers.current.set(t.id, mk);
      } else {
        mk.setLngLat([t.lng, t.lat]);
      }
      const el = mk.getElement();
      const size = isToilet ? (sel ? 20 : 16) : sel ? 28 : 24;
      el.style.cssText = `display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #08130f;box-shadow:0 0 8px ${color}${sel ? ',0 0 0 3px rgba(255,255,255,.25)' : ''};cursor:pointer;padding:0;font-size:${isToilet ? 0 : 13}px;line-height:1;`;
    });
  }, [toilets, selectedId]);

  if (!TOKEN) return null;
  return <div className="mapbox" ref={ref} />;
}
