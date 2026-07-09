'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CDMX_CENTER } from '@/lib/game';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

/**
 * Pin-drop picker for placing a physical node. Drag the marker or click the map.
 * (This is the NODE's real location — not user tracking — so precise is correct.)
 * Falls back to numeric lat/lng inputs when no Mapbox token is set.
 */
export function NodePicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!ref.current || map.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const start: [number, number] = [value.lng || CDMX_CENTER.lng, value.lat || CDMX_CENTER.lat];
    const m = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: start,
      zoom: 14,
      attributionControl: false,
    });
    const el = document.createElement('div');
    el.style.cssText =
      'width:22px;height:22px;border-radius:50%;background:var(--bs-gold,#f4c24a);border:2px solid #08130f;box-shadow:0 0 10px #f4c24a;cursor:grab;';
    const mk = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(start).addTo(m);
    mk.on('dragend', () => {
      const ll = mk.getLngLat();
      onChangeRef.current({ lat: ll.lat, lng: ll.lng });
    });
    m.on('click', (e) => {
      mk.setLngLat(e.lngLat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    map.current = m;
    marker.current = mk;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep marker in sync when value changes from outside (e.g. "use my location")
  useEffect(() => {
    if (!marker.current || !map.current) return;
    if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      marker.current.setLngLat([value.lng, value.lat]);
      map.current.easeTo({ center: [value.lng, value.lat], duration: 400 });
    }
  }, [value.lat, value.lng]);

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => onChangeRef.current({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="nodepicker">
      {TOKEN ? (
        <div className="nodepicker-map" ref={ref} style={{ height: 220, borderRadius: 12, overflow: 'hidden' }} />
      ) : null}
      <div className="nodepicker-fields" style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 120 }}>
          <span className="fieldlabel">Lat</span>
          <input
            type="number"
            step="any"
            value={Number.isFinite(value.lat) ? value.lat : ''}
            onChange={(e) => onChange({ ...value, lat: Number(e.target.value) })}
          />
        </label>
        <label style={{ flex: 1, minWidth: 120 }}>
          <span className="fieldlabel">Lng</span>
          <input
            type="number"
            step="any"
            value={Number.isFinite(value.lng) ? value.lng : ''}
            onChange={(e) => onChange({ ...value, lng: Number(e.target.value) })}
          />
        </label>
        <button type="button" className="ghostbtn" onClick={useMyLocation} style={{ alignSelf: 'flex-end' }}>
          📍 Usar mi ubicación
        </button>
      </div>
      <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
        Arrastra el pin o toca el mapa para ubicar el nodo físico.
      </p>
    </div>
  );
}
