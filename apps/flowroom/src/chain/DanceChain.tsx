import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildChain, buildEdges, lightChainOptions, type ChainData } from './buildChain';
import { isLightDevice, prefersReducedMotion } from '@/lib/motion';

/* --------------------------------------------------------------------- */
/* Shaders                                                                */
/*                                                                        */
/* The node sprite (asset A6 in the pack) is computed in the fragment      */
/* shader rather than downloaded: a soft radial falloff with a faint       */
/* chromatic edge toward magenta. It costs no bytes, no credits, and it    */
/* stays sharp at any DPR.                                                 */
/* --------------------------------------------------------------------- */

const REVEAL = /* glsl */ `
  // Each generation owns a window of the scroll. Within a window, nodes
  // stagger by their own seed, so a generation blooms instead of snapping on.
  float revealFor(float aGen, float aSeed, float uGrowth, float uGens, float lead) {
    float span  = 1.0 / uGens;
    float start = aGen * span - lead;
    float local = (uGrowth - start) / (span * 1.6);
    return clamp(smoothstep(0.0, 1.0, local - aSeed * 0.3), 0.0, 1.0);
  }
`;

const POINT_VERT = /* glsl */ `
  uniform float uGrowth, uTime, uQuarantine, uQBranch, uSize, uGens, uDrift;
  attribute float aGen;
  attribute float aSeed;
  attribute float aBranch;
  varying float vAlpha;
  varying float vQ;
  varying float vGen;
  ${REVEAL}

  void main() {
    float reveal = revealFor(aGen, aSeed, uGrowth, uGens, 0.0);

    vec3 p = position;
    float d = uTime * 0.22 + aSeed * 6.2831853;
    p += vec3(sin(d), cos(d * 0.83), sin(d * 1.27)) * (0.03 + aGen * 0.014) * uDrift;

    // One branch is quarantined: it desaturates, drifts off the tree, and is
    // no longer part of what the counter reports. Same UX, different asset.
    float q = step(abs(aBranch - uQBranch), 0.5) * uQuarantine;
    p += normalize(position + vec3(0.0001, 0.0001, 0.0001)) * q * 2.1;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * reveal * (1.0 - q * 0.4) * (300.0 / max(-mv.z, 0.001));

    vAlpha = reveal;
    vQ = q;
    vGen = aGen;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uC0, uC1, uC2, uC3, uOrigin, uCold;
  uniform float uGens;
  varying float vAlpha;
  varying float vQ;
  varying float vGen;

  // The heart on her chest, unrolled along the chain. Generation 0 is the
  // gold of the goddess herself; each ring outward moves further through
  // the gradient, so one move visibly becomes a spectrum.
  vec3 heart(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uC0, uC1, t);
    if (t < 2.0) return mix(uC1, uC2, t - 1.0);
    return mix(uC2, uC3, t - 2.0);
  }

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;

    float core = exp(-r2 * 5.5);
    float halo = exp(-r2 * 1.5) * 0.34;

    // Her move sits at gen 0 and stays the brightest thing in the volume.
    float origin = step(vGen, 0.5);
    vec3 tone = heart(vGen / max(uGens - 1.0, 1.0));
    tone = mix(tone, uOrigin, origin);            // her move stays gold
    tone = mix(tone * 0.55, tone, 1.0 - sqrt(r2)); // falloff toward the edge

    vec3 col = mix(tone, uCold, vQ);
    float a = (core + halo) * vAlpha * (1.0 - vQ * 0.55) * (1.0 + origin * 1.2);
    gl_FragColor = vec4(col * a, a);   // premultiplied, for additive blending
  }
`;

const EDGE_VERT = /* glsl */ `
  uniform float uGrowth, uTime, uQuarantine, uQBranch, uGens, uDrift;
  attribute float aGen;
  attribute float aSeed;
  attribute float aBranch;
  attribute float aEnd;
  varying float vLocal;
  varying float vEnd;
  varying float vQ;
  varying float vGenE;
  ${REVEAL}

  void main() {
    // Threads lead their nodes slightly, so an invitation arrives before the
    // woman it reaches. It reads as cause, not decoration.
    vLocal = revealFor(aGen, aSeed, uGrowth, uGens, 0.045);

    vec3 p = position;
    float d = uTime * 0.22 + aSeed * 6.2831853;
    p += vec3(sin(d), cos(d * 0.83), sin(d * 1.27)) * (0.03 + aGen * 0.014) * uDrift;

    float q = step(abs(aBranch - uQBranch), 0.5) * uQuarantine;
    p += normalize(position + vec3(0.0001, 0.0001, 0.0001)) * q * 2.1;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vEnd = aEnd;
    vQ = q;
    vGenE = aGen;
  }
`;

const EDGE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uC0, uC1, uC2, uC3, uCold;
  uniform float uGens;
  varying float vLocal;
  varying float vEnd;
  varying float vQ;
  varying float vGenE;

  vec3 heart(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uC0, uC1, t);
    if (t < 2.0) return mix(uC1, uC2, t - 1.0);
    return mix(uC2, uC3, t - 2.0);
  }

  void main() {
    // vEnd runs 0 at the parent to 1 at the child, so the thread draws in
    // along its own length rather than fading up all at once.
    float on = 1.0 - smoothstep(vLocal - 0.22, vLocal, vEnd);
    if (on <= 0.001) discard;

    // A quarantined thread breaks up rather than simply dimming.
    float broken = mix(1.0, step(0.45, fract(vEnd * 9.0)), vQ);

    vec3 col = mix(heart(vGenE / max(uGens - 1.0, 1.0)), uCold, vQ);
    float a = on * broken * (0.30 - vQ * 0.16);
    gl_FragColor = vec4(col * a, a);
  }
`;

/* --------------------------------------------------------------------- */

const c3 = (hex: string) => new THREE.Color(hex);

export interface DanceChainProps {
  /** 0 → 1, written by the parent's ScrollTrigger. Read every frame. */
  growthRef: React.MutableRefObject<number>;
  /** 0 → 1, written when the fraud-control block is reached. */
  quarantineRef: React.MutableRefObject<number>;
  /** Live count, already excluding the quarantined branch. */
  onCount?: (honest: number, excluded: number) => void;
  /** Drag-to-look. Used by the chamber; the scroll stage stays hands-off. */
  interactive?: boolean;
  /** CSS colour the chain is drawn in. Defaults to the slide's accent. */
  accent?: string;
  className?: string;
}

export default function DanceChain({
  growthRef,
  quarantineRef,
  onCount,
  interactive = false,
  accent,
  className,
}: DanceChainProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const still = prefersReducedMotion();
    const light = isLightDevice();

    // Reduced motion gets the finished chain, composed and static — the whole
    // argument is legible in one frame. It is not a broken version of this.
    const chain: ChainData = buildChain(light ? lightChainOptions : {});
    const edges = buildEdges(chain);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1.75 : 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, -1.1, 15.5);

    // The chain wears the slide's accent. Resolve a var() to its value so a
    // caller can pass `var(--gold)` straight through from the manifest.
    const css = getComputedStyle(document.documentElement);
    const resolve = (v?: string) => {
      if (!v) return null;
      const m = v.trim().match(/^var\((--[\w-]+)\)$/);
      const out = (m ? css.getPropertyValue(m[1]) : v).trim();
      return out || null;
    };
    const v = (name: string, fallback: string) => c3(resolve(`var(${name})`) ?? fallback);
    const cold = c3('#6A6A78'); // drained grey: the quarantine state

    const shared = {
      uGrowth: { value: still ? 1 : 0 },
      uTime: { value: 0 },
      uQuarantine: { value: still ? 1 : 0 },
      uQBranch: { value: 2 },
      uGens: { value: chain.generations },
      uDrift: { value: still ? 0 : 1 },
      uC0: { value: v('--rose', '#FF4FCF') },
      uC1: { value: v('--violet', '#A24BFF') },
      uC2: { value: v('--azure', '#4FA8FF') },
      uC3: { value: v('--sun', '#FFD84F') },
      uOrigin: { value: c3(resolve(accent) ?? '#F0C46A') },
      uCold: { value: cold },
      uSize: { value: light ? 2.3 : 2.0 },
    };

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(chain.positions, 3));
    pointGeo.setAttribute('aGen', new THREE.BufferAttribute(chain.gen, 1));
    pointGeo.setAttribute('aSeed', new THREE.BufferAttribute(chain.seed, 1));
    pointGeo.setAttribute('aBranch', new THREE.BufferAttribute(chain.branch, 1));

    const pointMat = new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edges.positions, 3));
    edgeGeo.setAttribute('aGen', new THREE.BufferAttribute(edges.gen, 1));
    edgeGeo.setAttribute('aSeed', new THREE.BufferAttribute(edges.seed, 1));
    edgeGeo.setAttribute('aBranch', new THREE.BufferAttribute(edges.branch, 1));
    edgeGeo.setAttribute('aEnd', new THREE.BufferAttribute(edges.end, 1));

    const edgeMat = new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const group = new THREE.Group();
    group.add(new THREE.LineSegments(edgeGeo, edgeMat));
    group.add(new THREE.Points(pointGeo, pointMat));
    scene.add(group);

    /* -- sizing ------------------------------------------------------- */
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Portrait phones need the camera further back or the chain crops.
      camera.position.z = w / h < 0.85 ? 20.5 : 15.5;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* -- look control -------------------------------------------------- */
    // Hard-capped on purpose. This is a guided space, not a free-fly — you
    // cannot get lost in it and you cannot clip through anything.
    const YAW_LIMIT = interactive ? Math.PI * 0.85 : 0.5;
    const PITCH_LIMIT = interactive ? 0.55 : 0.28;
    let targetX = 0;
    let targetY = 0;

    const clamp = (v: number, l: number) => Math.max(-l, Math.min(l, v));

    const onHover = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * YAW_LIMIT;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * PITCH_LIMIT;
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetX = clamp(targetX + (e.clientX - lastX) * 0.004, YAW_LIMIT);
      targetY = clamp(targetY + (e.clientY - lastY) * 0.003, PITCH_LIMIT);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => (dragging = false);

    if (!still) {
      if (interactive) {
        host.style.touchAction = 'none';
        host.style.cursor = 'grab';
        host.addEventListener('pointerdown', onDown);
        host.addEventListener('pointermove', onMove);
        host.addEventListener('pointerup', onUp);
        host.addEventListener('pointercancel', onUp);
      } else if (!light) {
        window.addEventListener('pointermove', onHover, { passive: true });
      }
    }

    /* -- counter ------------------------------------------------------ */
    // Full growth reads as exactly one million women. The quarantined branch
    // is subtracted from that number, visibly, which is the entire point.
    const PER_NODE = 1_000_000 / chain.count;
    let lastReport = -1;

    const revealedAt = (growth: number) => {
      const front = growth * chain.generations;
      const i = Math.min(Math.floor(front), chain.generations - 1);
      const prev = i === 0 ? 0 : chain.cumulative[i - 1];
      return prev + (chain.cumulative[i] - prev) * Math.min(front - i, 1);
    };

    /* -- loop --------------------------------------------------------- */
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      rootMargin: '200px',
    });
    io.observe(host);

    const clock = new THREE.Clock();
    let camX = 0;
    let camY = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return; // offscreen costs nothing

      const g = growthRef.current;
      const q = quarantineRef.current;
      shared.uGrowth.value = g;
      shared.uQuarantine.value = q;
      shared.uTime.value = clock.getElapsedTime();

      camX += (targetX - camX) * 0.045;
      camY += (targetY - camY) * 0.045;
      // Inside the chamber the drift stops fighting the hand that is steering.
      group.rotation.y = camX + clock.getElapsedTime() * (interactive ? 0.004 : 0.012);
      group.rotation.x = camY;

      if (onCount) {
        const revealed = revealedAt(g);
        const branchShare = chain.branchTotals[shared.uQBranch.value] / chain.count;
        const excluded = revealed * branchShare * q;
        const honest = Math.round((revealed - excluded) * PER_NODE);
        if (honest !== lastReport) {
          lastReport = honest;
          onCount(honest, Math.round(excluded * PER_NODE));
        }
      }

      renderer.render(scene, camera);
    };

    if (still) {
      // One composed frame, then nothing. No rAF, no battery, no motion.
      shared.uTime.value = 0;
      group.rotation.set(0.05, 0.35, 0);
      renderer.render(scene, camera);
      if (onCount) onCount(Math.round(1_000_000 * (1 - chain.branchTotals[2] / chain.count)), 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onHover);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      pointGeo.dispose();
      edgeGeo.dispose();
      pointMat.dispose();
      edgeMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [growthRef, quarantineRef, onCount, interactive, accent]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
