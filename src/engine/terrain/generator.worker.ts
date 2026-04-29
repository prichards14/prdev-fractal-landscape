import { createNoise2D } from 'simplex-noise';
import type { TerrainParams } from '../../types/params';

// Seeded PRNG (mulberry32) so same seed always gives same terrain
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHeightmap(params: TerrainParams): Float32Array {
  const { size, octaves, persistence, lacunarity, heightScale, seed, scale } = params;
  const rand = mulberry32(seed);
  const noise2D = createNoise2D(rand);

  const heights = new Float32Array(size * size);

  // Find min/max for normalization
  let min = Infinity;
  let max = -Infinity;

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      let amplitude = 1;
      let frequency = 1;
      let noiseVal = 0;
      let maxAmplitude = 0;

      for (let o = 0; o < octaves; o++) {
        const nx = (x / size) * frequency * (scale / 100);
        const nz = (z / size) * frequency * (scale / 100);
        noiseVal += noise2D(nx, nz) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      noiseVal /= maxAmplitude; // normalize to [-1, 1]
      heights[z * size + x] = noiseVal;
      if (noiseVal < min) min = noiseVal;
      if (noiseVal > max) max = noiseVal;
    }
  }

  // Remap to [0, heightScale]
  const range = max - min;
  for (let i = 0; i < heights.length; i++) {
    heights[i] = ((heights[i] - min) / range) * heightScale;
  }

  return heights;
}

function computeNormals(heights: Float32Array, size: number, _heightScale: number): Float32Array {
  const normals = new Float32Array(size * size * 3);
  const cellSize = 1; // world units per grid cell (we'll scale later)

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const idx = z * size + x;

      const hL = heights[z * size + Math.max(x - 1, 0)];
      const hR = heights[z * size + Math.min(x + 1, size - 1)];
      const hD = heights[Math.max(z - 1, 0) * size + x];
      const hU = heights[Math.min(z + 1, size - 1) * size + x];

      // Central difference gradient
      const dx = (hR - hL) / (2 * cellSize);
      const dz = (hU - hD) / (2 * cellSize);

      // Normal = cross(-dx, 1, -dz) normalized
      const len = Math.sqrt(dx * dx + 1 + dz * dz);
      normals[idx * 3 + 0] = -dx / len;
      normals[idx * 3 + 1] = 1 / len;
      normals[idx * 3 + 2] = -dz / len;
    }
  }

  return normals;
}

self.onmessage = (e: MessageEvent<{ params: TerrainParams; id: number }>) => {
  const { params, id } = e.data;
  const heights = generateHeightmap(params);
  const normals = computeNormals(heights, params.size, params.heightScale);

  self.postMessage(
    { heights, normals, size: params.size, heightScale: params.heightScale, id },
    { transfer: [heights.buffer, normals.buffer] }
  );
};
