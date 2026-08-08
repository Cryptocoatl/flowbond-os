/**
 * The Dance Chain — deterministic tree generation.
 *
 * One node is one woman. One edge is one invitation. The whole argument of
 * §03 is that this is a tree you can walk, so the geometry is an actual tree
 * with real parent pointers, not a particle cloud that happens to look like one.
 *
 * Deterministic from a seed: the same room draws the same chain on every load
 * and on every device, which matters because Steph and Vandana will be looking
 * at it on a call.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChainData {
  count: number;
  generations: number;
  positions: Float32Array; // count * 3
  gen: Float32Array; // count
  seed: Float32Array; // count — per-node randomness for drift + stagger
  branch: Float32Array; // count — which gen-1 subtree, -1 for root
  parent: Int32Array; // count — index of parent, -1 for root
  /** Running total of nodes at or below each generation. Drives the counter. */
  cumulative: number[];
  /** Node totals per gen-1 subtree, so quarantine can subtract honestly. */
  branchTotals: number[];
  branchCount: number;
}

export interface ChainOptions {
  seed?: number;
  /** Children per node, one entry per generation step. Length = generations - 1. */
  fanout?: number[];
  scale?: number;
}

const DESKTOP_FANOUT = [5, 5, 5, 4, 4, 4];
const LIGHT_FANOUT = [5, 4, 4, 4, 3];

export function buildChain(opts: ChainOptions = {}): ChainData {
  const fanout = opts.fanout ?? DESKTOP_FANOUT;
  const scale = opts.scale ?? 1;
  const rand = mulberry32(opts.seed ?? 20260814);

  const generations = fanout.length + 1;

  // Size the buffers exactly — no growth, no waste.
  let total = 1;
  let levelSize = 1;
  const perGen: number[] = [1];
  for (const f of fanout) {
    levelSize *= f;
    perGen.push(levelSize);
    total += levelSize;
  }

  const positions = new Float32Array(total * 3);
  const gen = new Float32Array(total);
  const seedAttr = new Float32Array(total);
  const branch = new Float32Array(total);
  const parent = new Int32Array(total);
  // Direction is kept out of the public shape — it only matters while building.
  const dir = new Float32Array(total * 3);

  // Root: her move. Low in the volume, pointing up into the branching.
  const ROOT_Y = -3.4 * scale;
  positions[0] = 0;
  positions[1] = ROOT_Y;
  positions[2] = 0;
  dir[0] = 0;
  dir[1] = 1;
  dir[2] = 0;
  gen[0] = 0;
  seedAttr[0] = rand();
  branch[0] = -1;
  parent[0] = -1;

  let writeHead = 1;
  let levelStart = 0;
  let levelCount = 1;

  for (let g = 1; g < generations; g++) {
    const f = fanout[g - 1];
    // Branches shorten and splay wider as the chain gets further from her.
    const len = 2.55 * Math.pow(0.74, g - 1) * scale;
    const spread = 0.52 + g * 0.13;

    for (let p = levelStart; p < levelStart + levelCount; p++) {
      const px = positions[p * 3];
      const py = positions[p * 3 + 1];
      const pz = positions[p * 3 + 2];
      const dx = dir[p * 3];
      const dy = dir[p * 3 + 1];
      const dz = dir[p * 3 + 2];

      // An orthonormal basis around the parent direction, so children splay
      // around the branch rather than around the world axes.
      let ux = -dy;
      let uy = dx;
      let uz = 0;
      let ul = Math.hypot(ux, uy, uz);
      if (ul < 1e-4) {
        ux = 1;
        uy = 0;
        uz = 0;
        ul = 1;
      }
      ux /= ul;
      uy /= ul;
      uz /= ul;
      const vx = dy * uz - dz * uy;
      const vy = dz * ux - dx * uz;
      const vz = dx * uy - dy * ux;

      const phase = rand() * Math.PI * 2;
      for (let c = 0; c < f; c++) {
        const theta = phase + (c / f) * Math.PI * 2 + (rand() - 0.5) * 0.9;
        const cone = spread * (0.45 + rand() * 0.75);
        const sc = Math.sin(cone);
        const cc = Math.cos(cone);

        let nx = dx * cc + (ux * Math.cos(theta) + vx * Math.sin(theta)) * sc;
        let ny = dy * cc + (uy * Math.cos(theta) + vy * Math.sin(theta)) * sc;
        let nz = dz * cc + (uz * Math.cos(theta) + vz * Math.sin(theta)) * sc;

        // A gentle upward bias keeps the chamber growing skyward instead of
        // collapsing into a sphere at high generation counts.
        ny += 0.18;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;

        const l = len * (0.72 + rand() * 0.62);
        const i = writeHead++;
        positions[i * 3] = px + nx * l;
        positions[i * 3 + 1] = py + ny * l;
        positions[i * 3 + 2] = pz + nz * l;
        dir[i * 3] = nx;
        dir[i * 3 + 1] = ny;
        dir[i * 3 + 2] = nz;
        gen[i] = g;
        seedAttr[i] = rand();
        parent[i] = p;
        branch[i] = g === 1 ? i - 1 : branch[p];
      }
    }

    levelStart += levelCount;
    levelCount = perGen[g];
  }

  const cumulative: number[] = [];
  let running = 0;
  for (const n of perGen) {
    running += n;
    cumulative.push(running);
  }

  const branchCount = fanout[0];
  const branchTotals = new Array<number>(branchCount).fill(0);
  for (let i = 1; i < total; i++) branchTotals[branch[i]]++;

  return {
    count: total,
    generations,
    positions,
    gen,
    seed: seedAttr,
    branch,
    parent,
    cumulative,
    branchTotals,
    branchCount,
  };
}

export const lightChainOptions: ChainOptions = { fanout: LIGHT_FANOUT };

/**
 * Edge buffers: two vertices per edge, `end` running 0 → 1 along the edge so
 * the fragment shader can draw each thread in rather than just fading it up.
 */
export function buildEdges(c: ChainData) {
  const edges = c.count - 1;
  const pos = new Float32Array(edges * 6);
  const gen = new Float32Array(edges * 2);
  const seed = new Float32Array(edges * 2);
  const branch = new Float32Array(edges * 2);
  const end = new Float32Array(edges * 2);

  let e = 0;
  for (let i = 1; i < c.count; i++) {
    const p = c.parent[i];
    pos[e * 6] = c.positions[p * 3];
    pos[e * 6 + 1] = c.positions[p * 3 + 1];
    pos[e * 6 + 2] = c.positions[p * 3 + 2];
    pos[e * 6 + 3] = c.positions[i * 3];
    pos[e * 6 + 4] = c.positions[i * 3 + 1];
    pos[e * 6 + 5] = c.positions[i * 3 + 2];

    // Both vertices carry the child's generation: an edge belongs to the node
    // it creates, so it draws in exactly when that node appears.
    gen[e * 2] = c.gen[i];
    gen[e * 2 + 1] = c.gen[i];
    seed[e * 2] = c.seed[i];
    seed[e * 2 + 1] = c.seed[i];
    branch[e * 2] = c.branch[i];
    branch[e * 2 + 1] = c.branch[i];
    end[e * 2] = 0;
    end[e * 2 + 1] = 1;
    e++;
  }

  return { positions: pos, gen, seed, branch, end, count: edges };
}
