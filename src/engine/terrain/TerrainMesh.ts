import * as THREE from 'three';
import { buildColorArray } from './colorMap';
import type { TerrainParams, WaterParams } from '../../types/params';

export interface HeightmapData {
  heights: Float32Array;
  normals: Float32Array;
  size: number;
  heightScale: number;
}

export function buildTerrainMesh(data: HeightmapData, terrain: TerrainParams, water: WaterParams): THREE.Mesh {
  const { heights, normals, size, heightScale } = data;
  const worldSize = terrain.scale;

  const geometry = new THREE.PlaneGeometry(worldSize, worldSize, size - 1, size - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position.array as Float32Array;
  const geoNormals = geometry.attributes.normal.array as Float32Array;

  // PlaneGeometry vertices go left-to-right, top-to-bottom after rotation
  for (let i = 0; i < size * size; i++) {
    positions[i * 3 + 1] = heights[i]; // Y = elevation
    geoNormals[i * 3 + 0] = normals[i * 3 + 0];
    geoNormals[i * 3 + 1] = normals[i * 3 + 1];
    geoNormals[i * 3 + 2] = normals[i * 3 + 2];
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.normal.needsUpdate = true;

  // Vertex colors based on elevation
  const colors = buildColorArray(heights, size, heightScale, water.seaLevel);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'terrain';

  return mesh;
}

export function getHeightAt(heights: Float32Array, size: number, worldSize: number, wx: number, wz: number): number {
  // Convert world coords to grid coords
  const gx = ((wx + worldSize / 2) / worldSize) * (size - 1);
  const gz = ((wz + worldSize / 2) / worldSize) * (size - 1);

  const x0 = Math.max(0, Math.min(size - 2, Math.floor(gx)));
  const z0 = Math.max(0, Math.min(size - 2, Math.floor(gz)));
  const fx = gx - x0;
  const fz = gz - z0;

  const h00 = heights[z0 * size + x0];
  const h10 = heights[z0 * size + x0 + 1];
  const h01 = heights[(z0 + 1) * size + x0];
  const h11 = heights[(z0 + 1) * size + x0 + 1];

  // Bilinear interpolation
  return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
}

export function getSlopeAt(normals: Float32Array, size: number, worldSize: number, wx: number, wz: number): number {
  const gx = Math.round(((wx + worldSize / 2) / worldSize) * (size - 1));
  const gz = Math.round(((wz + worldSize / 2) / worldSize) * (size - 1));
  const cx = Math.max(0, Math.min(size - 1, gx));
  const cz = Math.max(0, Math.min(size - 1, gz));
  const idx = cz * size + cx;
  // Slope = 1 - dot(normal, up). 0 = flat, 1 = vertical
  return 1 - normals[idx * 3 + 1];
}
