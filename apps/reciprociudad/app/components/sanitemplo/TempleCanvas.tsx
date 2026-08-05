'use client';

/**
 * TempleCanvas — el único momento de asombro. Geometría en metros reales
 * (UNIT_M), texturas GENERADAS en canvas a escala en cm: el mismo código a PX=3
 * pinta la pantalla y a PX=71 escupe el archivo a 600 DPI. El mockup de venta y
 * el archivo de producción son el MISMO objeto — ese es el apalancamiento: un
 * patrocinador nuevo no es un rediseño, es un swap de logo que ya trae su PSD.
 *
 * Nota de implementación: se usa @react-three/fiber + three (ya instalados en el
 * app), no r128 por cdnjs. Puertas abiertas por defecto. Al "Entrar", la cámara
 * cruza la puerta y la luz pasa de fría a oro. Si no hay WebGL, no pasa nada malo:
 * el tabulador vive aparte y esta isla simplemente muestra un plano quieto.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TOKENS, UNIT_M, SPACES } from '@flowbond/sanitemplo-core';

const C = TOKENS.color;

/** Dibuja el panel de un espacio a escala en cm. PX=3 pantalla · PX=71 → 600dpi. */
export function drawPanel(
  opts: { wCm: number; hCm: number; label: string; logo?: HTMLImageElement | null; px?: number },
): HTMLCanvasElement {
  const PX = opts.px ?? 3;
  const w = Math.max(2, Math.round(opts.wCm * PX));
  const h = Math.max(2, Math.round(opts.hCm * PX));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  // fondo obsidiana cálida
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, C.tinta2);
  bg.addColorStop(1, C.tinta);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // el oro es línea, no relleno: marco fino
  ctx.strokeStyle = C.oro;
  ctx.lineWidth = Math.max(1, PX);
  ctx.strokeRect(PX * 2, PX * 2, w - PX * 4, h - PX * 4);

  // logo del patrocinador (si hay) o el nombre del espacio en display
  if (opts.logo && opts.logo.width) {
    const pad = PX * 8;
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const r = Math.min(maxW / opts.logo.width, maxH / opts.logo.height);
    const lw = opts.logo.width * r;
    const lh = opts.logo.height * r;
    ctx.drawImage(opts.logo, (w - lw) / 2, (h - lh) / 2, lw, lh);
  } else {
    ctx.fillStyle = C.oro2;
    ctx.font = `${Math.round(h * 0.28)}px "Marcellus", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label, w / 2, h / 2);
  }
  return cv;
}

function usePanelTexture(space: { cm?: [number, number]; name: string }, logo: HTMLImageElement | null) {
  return useMemo(() => {
    const [wCm, hCm] = space.cm ?? [100, 40];
    const tex = new THREE.CanvasTexture(drawPanel({ wCm, hCm, label: space.name, logo }));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [space, logo]);
}

/** Rig de cámara: cruza la puerta al entrar. Todo lo demás está quieto. */
function CameraRig({ inside }: { inside: boolean }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, UNIT_M.H * 0.5, 0));
  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.001, dt); // suavizado tipo easeSacred
    const to = inside
      ? new THREE.Vector3(0, UNIT_M.H * 0.5, 0.2)
      : new THREE.Vector3(UNIT_M.W * 0.9, UNIT_M.H * 0.8, UNIT_M.D * 2.6);
    camera.position.lerp(to, k);
    const look = inside ? new THREE.Vector3(0, UNIT_M.H * 0.55, -UNIT_M.D) : new THREE.Vector3(0, UNIT_M.H * 0.45, 0);
    target.current.lerp(look, k);
    camera.lookAt(target.current);
  });
  return null;
}

function Temple({
  logo,
  inside,
  onAltar,
  onSelect,
}: {
  logo: HTMLImageElement | null;
  inside: boolean;
  onAltar: () => void;
  onSelect: (id: string) => void;
}) {
  const { W, D, H } = UNIT_M;
  const sol = SPACES.find((s) => s.id === 'sol')!;
  const loto = SPACES.find((s) => s.id === 'loto')!;
  const solTex = usePanelTexture(sol, logo);
  const lotoTex = usePanelTexture(loto, logo);
  const wall = new THREE.MeshStandardMaterial({ color: C.tinta3, roughness: 0.9, metalness: 0.05 });
  const interior = SPACES.filter((s) => s.zona === 'interior' && !s.sacred);

  return (
    <group position={[0, 0, 0]}>
      {/* piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 3, D * 4]} />
        <meshStandardMaterial color={C.tinta} roughness={1} />
      </mesh>

      {/* pared posterior + banda Sol (con el logo del patrocinador) */}
      <mesh position={[0, H / 2, -D / 2]} material={wall}>
        <boxGeometry args={[W, H, 0.04]} />
      </mesh>
      <mesh position={[0, H * 0.78, -D / 2 + 0.03]}>
        <planeGeometry args={[W * 0.98, H * 0.24]} />
        <meshStandardMaterial map={solTex} emissive={C.oroDim} emissiveIntensity={0.15} />
      </mesh>

      {/* laterales */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, 0]} material={wall}>
          <boxGeometry args={[0.04, H, D]} />
        </mesh>
      ))}

      {/* frente: dos pilares (Loto) y la puerta ABIERTA en medio */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 3.2, H / 2, D / 2]} onClick={() => onSelect('loto')}>
          <boxGeometry args={[W * 0.22, H, 0.04]} />
          <meshStandardMaterial map={lotoTex} />
        </mesh>
      ))}

      {/* techo */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[W * 1.06, 0.05, D * 1.06]} />
        <meshStandardMaterial color={C.tinta3} roughness={0.8} />
      </mesh>

      {/* altar central — no se vende, y responde */}
      <mesh
        position={[0, H * 0.28, -D * 0.22]}
        onClick={(e) => {
          e.stopPropagation();
          onAltar();
        }}
      >
        <cylinderGeometry args={[0.16, 0.2, H * 0.56, 6]} />
        <meshStandardMaterial color={C.tinta3} emissive={C.oro} emissiveIntensity={inside ? 0.5 : 0.15} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* loto en oro sobre el altar (línea, no silueta) */}
      <mesh position={[0, H * 0.58, -D * 0.22]}>
        <torusGeometry args={[0.1, 0.008, 8, 24]} />
        <meshStandardMaterial color={C.oro2} emissive={C.oro} emissiveIntensity={0.6} />
      </mesh>

      {/* marcadores clicables de los espacios interiores (solo dentro) */}
      {inside &&
        interior.map((sp, i) => {
          const a = (i / interior.length) * Math.PI * 1.6 - Math.PI * 0.8;
          return (
            <mesh key={sp.id} position={[Math.sin(a) * W * 0.32, H * 0.5, -D * 0.15 + Math.cos(a) * D * 0.2]} onClick={(e) => { e.stopPropagation(); onSelect(sp.id); }}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshStandardMaterial color={C.oro2} emissive={C.oro} emissiveIntensity={0.7} />
            </mesh>
          );
        })}
    </group>
  );
}

export default function TempleCanvas({
  logoUrl,
  onAltar,
  onSelectSpace,
}: {
  logoUrl: string | null;
  onAltar: () => void;
  onSelectSpace: (id: string) => void;
}) {
  const [inside, setInside] = useState(false);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => {
    if (!logoUrl) {
      setLogo(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLogo(img);
    img.src = logoUrl;
  }, [logoUrl]);

  function downloadPrint() {
    const sol = SPACES.find((s) => s.id === 'sol')!;
    const [wCm, hCm] = sol.cm ?? [232, 46];
    const cv = drawPanel({ wCm, hCm, label: sol.name, logo, px: 71 }); // ~600 dpi
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `sani-templo-${sol.id}-600dpi.png`;
    a.click();
  }

  if (!webgl) {
    return (
      <div className="st-card" style={{ textAlign: 'center' }}>
        <p className="st-lead">Tu navegador no muestra el templo en 3D, pero el tabulador funciona igual.</p>
        <button className="st-btn st-btn--ghost" style={{ marginTop: 12 }} onClick={downloadPrint}>
          Descargar archivo de impresión (600 dpi)
        </button>
      </div>
    );
  }

  return (
    <div className="st-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 'min(56vh, 460px)', background: 'var(--st-tinta)' }}>
        <Canvas camera={{ position: [UNIT_M.W, UNIT_M.H, UNIT_M.D * 3], fov: 42 }} dpr={[1, 2]} shadows>
          <color attach="background" args={[C.tinta]} />
          <ambientLight intensity={inside ? 0.35 : 0.5} />
          <directionalLight position={[3, 5, 4]} intensity={inside ? 0.4 : 0.9} color={inside ? C.oro2 : C.cal} />
          <pointLight position={[0, UNIT_M.H * 0.6, -UNIT_M.D * 0.2]} intensity={inside ? 2.2 : 0.4} color={C.oro} distance={4} />
          <Temple logo={logo} inside={inside} onAltar={onAltar} onSelect={onSelectSpace} />
          <CameraRig inside={inside} />
          <fog attach="fog" args={[C.tinta, inside ? 1.5 : 6, inside ? 5 : 14]} />
        </Canvas>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14, borderTop: '1px solid var(--st-linea)' }}>
        <button className="st-btn" onClick={() => setInside((v) => !v)}>
          {inside ? '← Salir' : 'Entrar al templo →'}
        </button>
        <button className="st-btn st-btn--ghost" onClick={downloadPrint}>
          Descargar archivo de impresión (600 dpi)
        </button>
        <span className="st-lead" style={{ fontSize: 12, alignSelf: 'center' }}>
          El mismo objeto que ves es el PSD de producción. Swap de logo, nada de rediseño.
        </span>
      </div>
    </div>
  );
}
