import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getHeightAt, getSlopeAt } from '../terrain/TerrainMesh';
import type { TerrainParams, VegetationParams, WaterParams } from '../../types/params';

const MAX_TREES = 35_000;
const TREE_NAMES = ['trees-conifer', 'trees-deciduous'];

// ─── RNG ──────────────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function applyVertexColors(geo: THREE.BufferGeometry, r: number, g: number, b: number, vary = 0.04) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = (Math.sin(i * 127.1 + r * 311.7) * 0.5 + 0.5) * vary;
    c[i * 3 + 0] = Math.max(0, Math.min(1, r + v - vary / 2));
    c[i * 3 + 1] = Math.max(0, Math.min(1, g + v - vary / 2));
    c[i * 3 + 2] = Math.max(0, Math.min(1, b + v - vary / 2));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

function perturbRingVertices(pos: Float32Array, waveCount: number, waveAmp: number, phaseOffset: number) {
  for (let v = 0; v < pos.length; v += 3) {
    const vx = pos[v], vz = pos[v + 2];
    const dist = Math.sqrt(vx * vx + vz * vz);
    if (dist < 0.01) continue; // apex / centre — don't touch
    const angle = Math.atan2(vz, vx);
    const wave = 1.0 + waveAmp * Math.sin(angle * waveCount + phaseOffset);
    pos[v] *= wave;
    pos[v + 2] *= wave;
  }
}

// ─── Conifer (spruce / fir) ───────────────────────────────────────────────────
// Multi-tier, wave-perturbed cones — each tier rotated by the golden angle so
// "branches" never line up, giving an asymmetric silhouette.

let _coniferGeo: THREE.BufferGeometry | null = null;

function buildConiferGeometry(): THREE.BufferGeometry {
  if (_coniferGeo) return _coniferGeo;

  const TIERS = 9;
  const H = 5.0;          // total height
  const MAX_R = H * 0.19; // quite narrow
  const SEGS = 16;        // enough sides that wave perturbation looks smooth
  const parts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < TIERS; i++) {
    const t = i / (TIERS - 1); // 0 = bottom, 1 = top
    // Bottom tiers are wide and squat; top tiers narrow and taller
    const r = MAX_R * (1.0 - t * 0.78) * (0.88 + Math.sin(i * 2.1) * 0.12);
    const h = H * 0.30 * (0.9 + Math.sin(i * 1.7) * 0.1);
    const y = t * H * 0.84;

    const cone = new THREE.ConeGeometry(r, h, SEGS);
    // Golden-angle rotation per tier → branches never align
    cone.rotateY(i * 2.3999); // ≈ 137.5 ° in radians × i
    cone.translate(0, y + h * 0.42, 0);

    // Wave perturbation — different frequency & phase per tier
    const pos = cone.attributes.position.array as Float32Array;
    perturbRingVertices(pos, 5 + (i % 3) * 2, 0.25, i * 1.13);
    cone.attributes.position.needsUpdate = true;
    cone.computeVertexNormals();

    // Colour: darkest at base, tiny bit lighter toward top
    const gr = 0.19 + t * 0.08;
    applyVertexColors(cone, 0.05 + t * 0.02, gr, 0.04 + t * 0.01, 0.03);
    parts.push(cone);
  }

  // Slim trunk
  const trunkH = H * 0.14;
  const trunk = new THREE.CylinderGeometry(MAX_R * 0.10, MAX_R * 0.16, trunkH, 7);
  trunk.translate(0, trunkH / 2, 0);
  applyVertexColors(trunk, 0.24, 0.13, 0.07, 0.02);
  parts.push(trunk);

  _coniferGeo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return _coniferGeo;
}

// ─── Deciduous (oak / maple style) ───────────────────────────────────────────
// Perturbed icosahedron gives an organic, lumpy canopy.
// Slight vertical flattening makes it look like a real broadleaf crown.

let _deciduousGeo: THREE.BufferGeometry | null = null;

function buildDeciduousGeometry(): THREE.BufferGeometry {
  if (_deciduousGeo) return _deciduousGeo;

  const H = 4.2;
  const R = H * 0.36;

  // IcosahedronGeometry detail=2 → 80 triangles, organic with vertex perturbation
  const sphere = new THREE.IcosahedronGeometry(R, 2);

  const pos = sphere.attributes.position.array as Float32Array;
  for (let v = 0; v < pos.length; v += 3) {
    const px = pos[v], py = pos[v + 1], pz = pos[v + 2];
    // Multi-frequency sine perturbation in all three axes
    const wobble =
      0.18 * Math.sin(px * 4.1 + py * 2.7) +
      0.14 * Math.sin(py * 3.8 + pz * 2.3) +
      0.10 * Math.sin(pz * 5.2 + px * 1.9);
    const scale = 1.0 + wobble;
    pos[v] = px * scale;
    // Flatten top slightly, keep bottom rounder (more natural crown shape)
    pos[v + 1] = py * (py > 0 ? 0.82 : 0.92) * scale;
    pos[v + 2] = pz * scale;
  }
  sphere.attributes.position.needsUpdate = true;
  sphere.computeVertexNormals();
  sphere.translate(0, H * 0.60, 0); // lift canopy off ground

  applyVertexColors(sphere, 0.13, 0.38, 0.07, 0.06);

  // Trunk — IcosahedronGeometry (detail>0) is non-indexed; CylinderGeometry is
  // indexed. mergeGeometries requires all geometries to match, so convert trunk.
  const trunkH = H * 0.38;
  const trunkIndexed = new THREE.CylinderGeometry(R * 0.075, R * 0.13, trunkH, 7);
  trunkIndexed.translate(0, trunkH / 2, 0);
  const trunk = trunkIndexed.toNonIndexed();
  trunkIndexed.dispose();
  applyVertexColors(trunk, 0.27, 0.16, 0.08, 0.03);

  _deciduousGeo = mergeGeometries([sphere, trunk]);
  [sphere, trunk].forEach((g) => g.dispose());
  return _deciduousGeo;
}

// ─── Placement ────────────────────────────────────────────────────────────────

export const TREE_OBJECT_NAMES = TREE_NAMES;

export function buildTreeSystem(
  heights: Float32Array,
  normals: Float32Array,
  terrain: TerrainParams,
  veg: VegetationParams,
  water: WaterParams
): THREE.InstancedMesh[] {
  if (!veg.enabled) return [];

  const rng = seededRng(terrain.seed * 7919 + 31337);
  const worldSize = terrain.scale;
  const hs = terrain.heightScale;

  const seaY = water.seaLevel * hs;
  const minY = Math.max(veg.minElevation * hs, seaY + hs * 0.025);
  const maxY = veg.maxElevation * hs;
  if (minY >= maxY) return [];

  // The transition elevation between deciduous and conifer
  const transitionY = minY + (maxY - minY) * 0.45;

  const targetCount = Math.min(MAX_TREES, Math.floor(worldSize * worldSize * veg.density));

  const coniferMats: THREE.Matrix4[] = [];
  const deciduousMats: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  let attempts = 0;

  while (coniferMats.length + deciduousMats.length < targetCount && attempts < targetCount * 12) {
    attempts++;
    const wx = (rng() - 0.5) * worldSize * 0.97;
    const wz = (rng() - 0.5) * worldSize * 0.97;

    const h = getHeightAt(heights, terrain.size, worldSize, wx, wz);
    if (h < minY || h > maxY) continue;

    const slope = getSlopeAt(normals, terrain.size, worldSize, wx, wz);
    if (slope > veg.maxSlope) continue;

    // Scale: conifers taller, deciduous a bit stouter
    const isCon = h >= transitionY;
    const baseScale = isCon ? 0.5 + rng() * 0.9 : 0.6 + rng() * 0.7;

    dummy.position.set(wx, h, wz);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.scale.setScalar(baseScale);
    dummy.updateMatrix();

    if (isCon) coniferMats.push(dummy.matrix.clone());
    else deciduousMats.push(dummy.matrix.clone());
  }

  const tintColor = new THREE.Color();
  const result: THREE.InstancedMesh[] = [];

  function makeInstanced(
    name: string,
    geo: THREE.BufferGeometry,
    matrices: THREE.Matrix4[],
    // hue shift range for instanceColor tinting
    rLo: number, rHi: number,
    gLo: number, gHi: number,
    bLo: number, bHi: number
  ) {
    if (matrices.length === 0 || !geo) return;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    mesh.name = name;
    mesh.castShadow = true;

    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      // Per-instance colour tint for variety
      tintColor.setRGB(
        rLo + rng() * (rHi - rLo),
        gLo + rng() * (gHi - gLo),
        bLo + rng() * (bHi - bLo)
      );
      mesh.setColorAt(i, tintColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    result.push(mesh);
  }

  // Conifers: slight yellow-green ↔ blue-green tint variation
  makeInstanced(
    'trees-conifer', buildConiferGeometry(), coniferMats,
    0.80, 1.05,  // R
    0.85, 1.10,  // G
    0.75, 0.98   // B
  );

  // Deciduous: yellow-green ↔ rich green
  makeInstanced(
    'trees-deciduous', buildDeciduousGeometry(), deciduousMats,
    0.80, 1.10,  // R
    0.82, 1.08,  // G
    0.70, 0.95   // B
  );

  return result;
}
