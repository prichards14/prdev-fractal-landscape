# fractal-landscape

A browser-based 3D landscape generator inspired by the classic Commodore Amiga program **Vista Pro** (1991). Generate fractal terrain with mountains, valleys, rivers, forests, and drifting clouds — all rendered in real time using WebGL.

![VistaPro Web screenshot](public/screenshot.png)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (bundled with Node.js)

### Clone, install, and run

```bash
git clone https://github.com/prichards14/prdev-fractal-landscape.git
cd prdev-fractal-landscape
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. A landscape generates automatically on first load.

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # serve the production build locally
```

The `dist/` folder contains a fully static site — drop it on any web host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, an S3 bucket, etc.) with no server-side requirements.

---

## What It Does

VistaPro Web generates photorealistic-looking landscapes entirely in the browser:

- **Fractal terrain** — multi-octave simplex noise produces mountains, ridges, and valleys. Every parameter (seed, scale, roughness) changes the shape of the world.
- **Elevation-accurate colour mapping** — terrain is automatically coloured by height: deep water → wet sand → lowland grass → rocky slopes → grey scree → snow caps.
- **Water** — a translucent plane sits at a configurable sea level, complete with specular highlights from the sun.
- **Altitude-appropriate vegetation** — deciduous trees (organic icosphere canopies) populate the lower slopes; conifers (layered, wave-perturbed cones) take over at higher elevations. Up to 35,000 trees are rendered using GPU instancing.
- **Procedural clouds** — unique blob-shaped clouds (clusters of merged spheres) drift across the sky in real time. Sun angle shades the undersides darker than the tops.
- **Physically positioned sun** — a directional light and the Three.js sky shader are driven by the same sun azimuth/elevation values, so the sky colour, shadows, and haze all shift together at sunset.
- **Atmospheric haze** — exponential fog fades distant terrain and warms to amber near the horizon at low sun angles.
- **Orbit camera** — drag to rotate, scroll to zoom, right-drag to pan. Fully free exploration of the generated world.
- **PNG export** — renders a 1920 × 1080 image of the current view.

---

## How It Works

### Tech stack

| Concern | Library |
|---|---|
| Rendering | [Three.js](https://threejs.org/) (WebGL) |
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Noise | [simplex-noise](https://github.com/jwagner/simplex-noise) |
| Sky shader | Three.js `examples/jsm/objects/Sky` |

### Terrain generation (Web Worker)

Heightmap generation runs in a dedicated **Web Worker** so the UI thread never blocks. The worker:

1. Seeds a mulberry32 PRNG from the user's seed value.
2. Calls `simplex-noise` in multiple octaves (frequency, amplitude, persistence, lacunarity all configurable).
3. Normalises the result to `[0, heightScale]` world units.
4. Computes per-vertex normals via central differences.
5. Transfers the `Float32Array` buffers back to the main thread using zero-copy `Transferable` objects.

### Terrain mesh

A `THREE.PlaneGeometry` (up to 1024 × 1024 vertices) is displaced on the Y axis by the heightmap. Vertex colours are written from a 9-stop elevation gradient (water → sand → grass → rock → snow) so no texture maps are needed.

### Vegetation

Tree placement runs on the main thread against the already-computed heightmap:

- A seeded RNG samples random (x, z) positions across the terrain.
- Each candidate is rejected if it falls below the water line, above the snow line, or on a slope steeper than the configured threshold.
- Accepted positions below the mid-elevation transition become **deciduous trees** (perturbed `IcosahedronGeometry` canopy); above it become **conifers** (9-tier wave-displaced cone stack).
- All trees of each type share one `THREE.InstancedMesh` — a single GPU draw call regardless of count. Per-instance colour tinting via `instanceColor` gives each tree a slightly different hue.

### Clouds

Each cloud is a unique `THREE.BufferGeometry` produced by merging 5–9 `IcosahedronGeometry` (detail 1) spheres at random offsets, then flattened vertically to match the wide, squat profile of real cumulus clouds. All clouds share one `MeshPhongMaterial` so the directional sun light shades their undersides automatically. Cloud positions are updated every frame using delta time for frame-rate-independent drift.

### Parameter system

Every slider maps to a typed `SceneParams` object. React `useEffect` hooks watch each parameter group independently:

| Parameters changed | Action |
|---|---|
| Terrain (seed, octaves, …) | Re-run noise worker → full scene rebuild |
| Water (sea level, colour, opacity) | Rebuild water plane + recolour terrain vertices |
| Vegetation (density, elevation, slope) | Re-place trees only |
| Clouds (count, altitude, speed, …) | Rebuild cloud meshes only |
| Atmosphere (sun, haze, …) | Update lights + sky shader uniform — instant |

---

## Project Structure

```
src/
  engine/
    terrain/
      generator.worker.ts   # Simplex noise heightmap (Web Worker)
      TerrainMesh.ts        # PlaneGeometry builder + height/slope samplers
      colorMap.ts           # 9-stop elevation colour gradient
    water/
      WaterPlane.ts         # Translucent sea-level plane
    atmosphere/
      Lighting.ts           # Directional sun + ambient + Three.js Sky shader
      CloudSystem.ts        # Procedural cloud geometry + drift animation
    vegetation/
      TreeSystem.ts         # Conifer + deciduous instanced meshes
    scene/
      SceneManager.ts       # Three.js orchestrator, camera, render loop
  components/
    ParametersPanel/        # Dark sidebar with all sliders
    ViewportCanvas/         # Canvas mount + per-group update effects
  types/
    params.ts               # All parameter interfaces + default values
  App.tsx                   # Worker lifecycle, state, export handler
```

---

## Keyboard & Mouse Controls

| Action | Input |
|---|---|
| Orbit (rotate) | Left-drag |
| Pan | Right-drag |
| Zoom | Scroll wheel |
| Export 1920×1080 PNG | Export PNG button |
| Regenerate terrain | Generate button |

---

## License

MIT
