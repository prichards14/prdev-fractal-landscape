import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getHeightAt, getSlopeAt } from '../terrain/TerrainMesh';
import type { TerrainParams, VegetationParams, WaterParams } from '../../types/params';

const MAX_TREES = 40_000;

function seededRng(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function colorAttribute(geo: THREE.BufferGeometry, r: number, g: number, b: number, vary = 0.04) {
  const rng = Math.random;
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = (rng() - 0.5) * vary * 2;
    c[i * 3] = Math.max(0, Math.min(1, r + v));
    c[i * 3 + 1] = Math.max(0, Math.min(1, g + v));
    c[i * 3 + 2] = Math.max(0, Math.min(1, b + v));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

// Shared tree geometry — built once, reused for all instanced meshes
let cachedTreeGeo: THREE.BufferGeometry | null = null;

export function getTreeGeometry(): THREE.BufferGeometry {
  if (cachedTreeGeo) return cachedTreeGeo;

  const h = 4.0;
  const r = h * 0.28;
  const parts: THREE.BufferGeometry[] = [];

  // Three layered cones — lighter at top, darker at base
  const layerColors: [number, number, number][] = [
    [0.08, 0.36, 0.07],
    [0.10, 0.30, 0.06],
    [0.07, 0.24, 0.05],
  ];
  for (let i = 0; i < 3; i++) {
    const lr = r * (1.15 - i * 0.22);
    const lh = h * 0.46;
    const y = h * 0.22 + i * h * 0.21;
    const cone = new THREE.ConeGeometry(lr, lh, 7);
    cone.translate(0, y, 0);
    const [cr, cg, cb] = layerColors[i];
    colorAttribute(cone, cr, cg, cb, 0.04);
    parts.push(cone);
  }

  // Trunk
  const trunkH = h * 0.26;
  const trunk = new THREE.CylinderGeometry(r * 0.09, r * 0.14, trunkH, 5);
  trunk.translate(0, trunkH / 2, 0);
  colorAttribute(trunk, 0.30, 0.18, 0.09, 0.02);
  parts.push(trunk);

  cachedTreeGeo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return cachedTreeGeo;
}

export function buildTreeSystem(
  heights: Float32Array,
  normals: Float32Array,
  terrain: TerrainParams,
  veg: VegetationParams,
  water: WaterParams
): THREE.InstancedMesh | null {
  if (!veg.enabled) return null;

  const rng = seededRng(terrain.seed * 7919 + 31337);
  const worldSize = terrain.scale;
  const hs = terrain.heightScale;

  const minY = Math.max(veg.minElevation * hs, water.seaLevel * hs + hs * 0.025);
  const maxY = veg.maxElevation * hs;
  if (minY >= maxY) return null;

  const targetCount = Math.min(MAX_TREES, Math.floor(worldSize * worldSize * veg.density));
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];

  let attempts = 0;
  const maxAttempts = targetCount * 12;

  while (matrices.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const wx = (rng() - 0.5) * worldSize * 0.97;
    const wz = (rng() - 0.5) * worldSize * 0.97;

    const h = getHeightAt(heights, terrain.size, worldSize, wx, wz);
    if (h < minY || h > maxY) continue;

    const slope = getSlopeAt(normals, terrain.size, worldSize, wx, wz);
    if (slope > veg.maxSlope) continue;

    const scale = 0.55 + rng() * 0.9;
    dummy.position.set(wx, h, wz);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }

  if (matrices.length === 0) return null;

  const geo = getTreeGeometry();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  mesh.name = 'trees';
  mesh.castShadow = true;

  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}
