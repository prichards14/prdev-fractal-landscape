import * as THREE from 'three';

// Elevation bands matching Vista Pro's classic look
// Each entry: [elevation 0–1, r, g, b]
const COLOR_STOPS: Array<[number, number, number, number]> = [
  [0.00, 0.05, 0.25, 0.50], // deep water (below sea level — terrain won't show here)
  [0.30, 0.76, 0.70, 0.50], // wet sand / beach
  [0.36, 0.33, 0.55, 0.20], // lush lowland green
  [0.52, 0.28, 0.48, 0.16], // mid-slope green
  [0.62, 0.52, 0.42, 0.28], // rocky brown
  [0.74, 0.45, 0.40, 0.36], // scree / grey-brown
  [0.84, 0.60, 0.58, 0.56], // grey rock
  [0.93, 0.85, 0.85, 0.88], // near-snow
  [1.00, 1.00, 1.00, 1.00], // snow cap
];

export function elevationToColor(t: number): THREE.Color {
  // Clamp
  t = Math.max(0, Math.min(1, t));

  // Find surrounding stops
  let lo = COLOR_STOPS[0];
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i][0] && t <= COLOR_STOPS[i + 1][0]) {
      lo = COLOR_STOPS[i];
      hi = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = hi[0] - lo[0];
  const alpha = range === 0 ? 0 : (t - lo[0]) / range;

  return new THREE.Color(
    lo[1] + (hi[1] - lo[1]) * alpha,
    lo[2] + (hi[2] - lo[2]) * alpha,
    lo[3] + (hi[3] - lo[3]) * alpha
  );
}

export function buildColorArray(
  heights: Float32Array,
  size: number,
  heightScale: number,
  seaLevel: number
): Float32Array {
  const colors = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const h = heights[i];
    // Map world height to 0–1 elevation fraction
    const t = h / heightScale;
    // Clamp anything below sea level to the beach color
    const effectiveT = Math.max(seaLevel - 0.01, t);
    const color = elevationToColor(effectiveT);
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return colors;
}
