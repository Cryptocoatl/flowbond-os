'use client';

/**
 * TempleCanvas v2 — el BAÑO Sani Templo vestido con sus LONAS. Cada cara es una
 * lona impresa (a escala en cm, PX=3 pantalla / PX=71 → 600dpi). El patrocinador
 * toca un panel para poner su marca ahí: "por baños en las lonas". Puertas
 * abiertas por defecto; VISTA INTERNA cruza al altar. Geometría en metros reales.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TOKENS, UNIT_M, SPACES } from '@flowbond/sanitemplo-core';

const C = TOKENS.color;

/** Dibuja una lona a escala en cm. PX=3 pantalla · PX=71 → archivo 600 dpi. */
export function drawLona(o: { wCm: number; hCm: number; label: string; brand?: HTMLImageElement | null; px?: number; vertical?: boolean }): HTMLCanvasElement {
  const PX = o.px ?? 3;
  const w = Math.max(4, Math.round(o.wCm * PX));
  const h = Math.max(4, Math.round(o.hCm * PX));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, C.tinta); bg.addColorStop(0.5, C.tinta2); bg.addColorStop(1, C.tinta);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = C.oroDim; ctx.lineWidth = Math.max(1, PX * 0.8);
  ctx.strokeRect(PX * 3, PX * 3, w - PX * 6, h - PX * 6);

  if (o.brand && o.brand.width) {
    const pad = PX * 10, mw = w - pad * 2, mh = h - pad * 2;
    const r = Math.min(mw / o.brand.width, mh / o.brand.height);
    ctx.drawImage(o.brand, (w - o.brand.width * r) / 2, (h - o.brand.height * r) / 2, o.brand.width * r, o.brand.height * r);
    return cv;
  }

  const cx = w / 2, cy = h / 2;
  ctx.strokeStyle = C.oro; ctx.lineWidth = Math.max(1, PX * 0.5);
  const petals = 8, R = Math.min(w, h) * 0.16;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.55, R * 0.22, a, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = C.oro2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.vertical) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2);
    ctx.font = `${Math.round(Math.min(w, h) * 0.5)}px "Marcellus", serif`;
    ctx.fillText('SANI TEMPLO', 0, -h * 0.02);
    ctx.restore();
  } else {
    ctx.font = `${Math.round(h * 0.16)}px "Marcellus", serif`;
    ctx.fillText(o.label.toUpperCase(), cx, cy - R * 1.4);
    ctx.fillStyle = C.calDim;
    ctx.font = `${Math.round(h * 0.07)}px "Karla", sans-serif`;
    ctx.fillText('Baños que honran la Tierra', cx, cy + R * 1.5);
  }
  return cv;
}

function useLona(space: { id: string; cm?: [number, number]; name: string }, brand: HTMLImageElement | null, vertical = false) {
  return useMemo(() => {
    const [wCm, hCm] = space.cm ?? [100, 40];
    const t = new THREE.CanvasTexture(drawLona({ wCm, hCm, label: space.name, brand, vertical }));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, [space, brand, vertical]);
}

function Rig({ inside }: { inside: boolean }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, UNIT_M.H * 0.5, 0));
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const k = 1 - Math.pow(0.0015, dt);
    const to = inside
      ? new THREE.Vector3(0, UNIT_M.H * 0.52, 0.25)
      : new THREE.Vector3(Math.sin(t.current * 0.2) * UNIT_M.W * 1.15, UNIT_M.H * 0.85, UNIT_M.D * 2.7);
    camera.position.lerp(to, k);
    look.current.lerp(inside ? new THREE.Vector3(0, UNIT_M.H * 0.55, -UNIT_M.D) : new THREE.Vector3(0, UNIT_M.H * 0.45, 0), k);
    camera.lookAt(look.current);
  });
  return null;
}

function Bano({ brand, inside, selected, onSelect, onAltar }: {
  brand: HTMLImageElement | null; inside: boolean; selected: string[];
  onSelect: (id: string) => void; onAltar: () => void;
}) {
  const { W, D, H } = UNIT_M;
  const g = (id: string) => SPACES.find((s) => s.id === id)!;
  const has = (id: string) => (selected.includes(id) && brand ? brand : null);
  const sol = useLona(g('sol'), has('sol'));
  const lotoL = useLona(g('loto'), has('loto'), true);
  const lunaL = useLona(g('luna'), has('luna'), true);
  const milpa = useLona(g('milpa'), has('milpa'));
  const shell = new THREE.MeshStandardMaterial({ color: C.tinta3, roughness: 0.85, metalness: 0.08 });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W * 3, D * 4]} /><meshStandardMaterial color={C.tinta} roughness={1} /></mesh>
      <mesh position={[0, H / 2, -D / 2]} material={shell}><boxGeometry args={[W, H, 0.05]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[(s * W) / 2, H / 2, 0]} material={shell}><boxGeometry args={[0.05, H, D]} /></mesh>)}
      <mesh position={[0, H + 0.03, 0]} material={shell}><boxGeometry args={[W * 1.08, 0.06, D * 1.08]} /></mesh>
      <mesh position={[0, 0.04, 0]} material={shell}><boxGeometry args={[W * 1.08, 0.08, D * 1.08]} /></mesh>

      <mesh position={[0, H * 0.8, -D / 2 + 0.03]} onClick={(e) => { e.stopPropagation(); onSelect('sol'); }}>
        <planeGeometry args={[W * 0.96, H * 0.24]} />
        <meshStandardMaterial map={sol} emissive={C.oroDim} emissiveIntensity={selected.includes('sol') ? 0.28 : 0.08} side={THREE.DoubleSide} />
      </mesh>
      {[[-1, Math.PI / 2], [1, -Math.PI / 2]].map(([s, r], i) => (
        <mesh key={i} position={[(s * W) / 2 + s * 0.03, H / 2, 0]} rotation={[0, r, 0]} onClick={(e) => { e.stopPropagation(); onSelect('luna'); }}>
          <planeGeometry args={[D * 0.9, H * 0.9]} />
          <meshStandardMaterial map={lunaL} emissive={C.oroDim} emissiveIntensity={selected.includes('luna') ? 0.28 : 0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 3.1, H / 2, D / 2]} onClick={(e) => { e.stopPropagation(); onSelect('loto'); }}>
          <planeGeometry args={[W * 0.24, H * 0.92]} />
          <meshStandardMaterial map={lotoL} emissive={C.oroDim} emissiveIntensity={selected.includes('loto') ? 0.28 : 0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, H * 0.14, D / 2 + 0.01]} onClick={(e) => { e.stopPropagation(); onSelect('milpa'); }}>
        <planeGeometry args={[W * 0.2, H * 0.14]} />
        <meshStandardMaterial map={milpa} emissive={C.oroDim} emissiveIntensity={selected.includes('milpa') ? 0.28 : 0.08} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, H * 0.28, -D * 0.22]} onClick={(e) => { e.stopPropagation(); onAltar(); }}>
        <cylinderGeometry args={[0.15, 0.19, H * 0.56, 6]} />
        <meshStandardMaterial color={C.tinta3} emissive={C.oro} emissiveIntensity={inside ? 0.55 : 0.12} roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh position={[0, H * 0.58, -D * 0.22]}><torusGeometry args={[0.09, 0.007, 8, 24]} /><meshStandardMaterial color={C.oro2} emissive={C.oro} emissiveIntensity={0.7} /></mesh>
    </group>
  );
}

export default function TempleCanvas({ brandUrl, selected, onSelectSpace, onAltar }: {
  brandUrl: string | null; selected: string[]; onSelectSpace: (id: string) => void; onAltar: () => void;
}) {
  const [inside, setInside] = useState(false);
  const [brand, setBrand] = useState<HTMLImageElement | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    try { const c = document.createElement('canvas'); setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl'))); } catch { setWebgl(false); }
  }, []);
  useEffect(() => {
    if (!brandUrl) { setBrand(null); return; }
    const img = new Image(); img.onload = () => setBrand(img); img.src = brandUrl;
  }, [brandUrl]);

  function downloadPrint() {
    const first = SPACES.find((s) => selected.includes(s.id) && s.cm) ?? SPACES.find((s) => s.id === 'sol')!;
    const [wCm, hCm] = first.cm ?? [232, 46];
    const cv = drawLona({ wCm, hCm, label: first.name, brand, px: 71 });
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `sani-templo-${first.id}-600dpi.png`; a.click();
  }

  if (!webgl) return (
    <div className="st-card" style={{ textAlign: 'center' }}>
      <p className="st-lead">Tu navegador no muestra el baño en 3D, pero la cotización funciona igual.</p>
      <button className="st-btn st-btn--ghost" style={{ marginTop: 12 }} onClick={downloadPrint}>Descargar lona · 600 dpi</button>
    </div>
  );

  return (
    <div className="st-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 'min(58vh, 500px)', background: 'var(--st-tinta)', position: 'relative' }} key={spin}>
        <Canvas camera={{ position: [UNIT_M.W, UNIT_M.H, UNIT_M.D * 3], fov: 40 }} dpr={[1, 2]}>
          <color attach="background" args={[C.tinta]} />
          <ambientLight intensity={inside ? 0.35 : 0.55} />
          <directionalLight position={[3, 6, 4]} intensity={inside ? 0.4 : 1} color={inside ? C.oro2 : C.cal} />
          <pointLight position={[0, UNIT_M.H * 0.6, -UNIT_M.D * 0.2]} intensity={inside ? 2.4 : 0.5} color={C.oro} distance={4} />
          <Bano brand={brand} inside={inside} selected={selected} onSelect={onSelectSpace} onAltar={onAltar} />
          <Rig inside={inside} />
          <fog attach="fog" args={[C.tinta, inside ? 1.4 : 6, inside ? 5 : 15]} />
        </Canvas>
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="st-btn" onClick={() => setInside((v) => !v)}>{inside ? '← Salir' : 'Vista interna →'}</button>
          <button className="st-btn st-btn--ghost" onClick={() => setSpin((s) => s + 1)}>Reencuadrar</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14, borderTop: '1px solid var(--st-linea)', alignItems: 'center' }}>
        <button className="st-btn st-btn--ghost" onClick={downloadPrint}>Descargar lona · 600 dpi</button>
        <span className="st-lead" style={{ fontSize: 12 }}>Toca un panel para poner tu marca. Lo que gira es el arte de impresión — swap de logo, no rediseño.</span>
      </div>
    </div>
  );
}
