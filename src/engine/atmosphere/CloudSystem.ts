import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CloudParams, TerrainParams } from '../../types/params';

function seededRng(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// One procedural cloud blob — several icospheres merged so each cloud is unique
// and safe to dispose independently.
function buildCloudGeometry(seed: number): THREE.BufferGeometry {
  const rng = seededRng(seed);

  const numPuffs = 5 + Math.floor(rng() * 5); // 5-9 puffs
  const cloudWidth = 25 + rng() * 35;
  const cloudDepth = 12 + rng() * 18;
  const baseR = 9 + rng() * 7;

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < numPuffs; i++) {
    // Puffs cluster toward the centre, thin out at the edges
    const t = i / numPuffs;
    const r = baseR * (1.0 - t * 0.45) * (0.65 + rng() * 0.7);
    const x = (rng() - 0.5) * cloudWidth * 2;
    const y = (rng() * 0.6 - 0.2) * baseR;   // mostly flat, slight vertical puff
    const z = (rng() - 0.5) * cloudDepth * 2;

    // IcosahedronGeometry (detail=1) is non-indexed — all parts match for merge
    const sphere = new THREE.IcosahedronGeometry(r, 1);
    sphere.translate(x, y, z);
    parts.push(sphere);
  }

  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function buildClouds(
  clouds: CloudParams,
  terrain: TerrainParams,
  seed: number
): { meshes: THREE.Mesh[]; material: THREE.MeshPhongMaterial } {
  const meshes: THREE.Mesh[] = [];

  if (!clouds.enabled || clouds.count === 0) {
    return { meshes, material: new THREE.MeshPhongMaterial() };
  }

  // Shared material — all clouds use the same one; caller owns disposal
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(clouds.color),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.08,  // keeps undersides from going pitch-black
    shininess: 12,
    transparent: true,
    opacity: clouds.opacity,
    depthWrite: false,        // correct blending with transparent objects
  });

  const rng = seededRng(seed * 3571 + 89);
  const worldSize = terrain.scale;
  // Place clouds well above the tallest possible peak
  const baseAltitude = clouds.altitude + terrain.heightScale * 0.1;

  for (let i = 0; i < clouds.count; i++) {
    const geo = buildCloudGeometry(seed * 1999 + i * 7919);
    const mesh = new THREE.Mesh(geo, material);

    const x = (rng() - 0.5) * worldSize * 1.6;
    const z = (rng() - 0.5) * worldSize * 1.6;
    const y = baseAltitude + (rng() - 0.5) * 25;
    const sx = 0.8 + rng() * 0.7;
    const sy = 0.35 + rng() * 0.25; // flatten: clouds are wide, not tall
    const sz = 0.8 + rng() * 0.7;

    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = rng() * Math.PI * 2;
    mesh.name = `cloud-${i}`;

    // Drift direction — mostly one way, slight cross-drift
    const driftAngle = rng() * Math.PI * 0.5 - Math.PI * 0.25; // ±45° spread
    mesh.userData.driftX = Math.cos(driftAngle) * clouds.speed * (0.7 + rng() * 0.6);
    mesh.userData.driftZ = Math.sin(driftAngle) * clouds.speed * (0.7 + rng() * 0.6);
    mesh.userData.bound = worldSize * 0.9;

    meshes.push(mesh);
  }

  return { meshes, material };
}

export function animateClouds(meshes: THREE.Mesh[], delta: number): void {
  for (const mesh of meshes) {
    const { driftX, driftZ, bound } = mesh.userData;
    mesh.position.x += driftX * delta;
    mesh.position.z += driftZ * delta;

    // Wrap around the edges so the sky is never bare
    if (mesh.position.x > bound) mesh.position.x = -bound;
    else if (mesh.position.x < -bound) mesh.position.x = bound;
    if (mesh.position.z > bound) mesh.position.z = -bound;
    else if (mesh.position.z < -bound) mesh.position.z = bound;
  }
}
