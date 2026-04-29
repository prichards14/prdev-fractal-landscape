export interface TerrainParams {
  seed: number;
  size: 256 | 512 | 1024;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  heightScale: number;
}

export interface WaterParams {
  seaLevel: number;
  color: string;
  opacity: number;
}

export interface VegetationParams {
  enabled: boolean;
  density: number;
  minElevation: number;
  maxElevation: number;
  maxSlope: number;
}

export interface AtmosphereParams {
  sunElevation: number;
  sunAzimuth: number;
  hazeNear: number;
  hazeFar: number;
  hazeColor: string;
  ambientIntensity: number;
  sunIntensity: number;
}

export interface CameraParams {
  fov: number;
}

export interface CloudParams {
  enabled: boolean;
  count: number;      // number of cloud masses
  altitude: number;   // world units above sea level
  opacity: number;
  speed: number;      // drift in world units/sec
  color: string;
}

export interface SceneParams {
  terrain: TerrainParams;
  water: WaterParams;
  vegetation: VegetationParams;
  atmosphere: AtmosphereParams;
  clouds: CloudParams;
  camera: CameraParams;
}

export const defaultParams: SceneParams = {
  terrain: {
    seed: 42,
    size: 512,
    scale: 500,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
    heightScale: 80,
  },
  water: {
    seaLevel: 0.3,
    color: '#1a6b9e',
    opacity: 0.85,
  },
  vegetation: {
    enabled: true,
    density: 0.04,
    minElevation: 0.32,
    maxElevation: 0.72,
    maxSlope: 0.6,
  },
  atmosphere: {
    sunElevation: 35,
    sunAzimuth: 220,
    hazeNear: 200,
    hazeFar: 600,
    hazeColor: '#c8d8e8',
    ambientIntensity: 0.4,
    sunIntensity: 1.8,
  },
  clouds: {
    enabled: true,
    count: 14,
    altitude: 140,
    opacity: 0.82,
    speed: 4.0,
    color: '#f0f4ff',
  },
  camera: {
    fov: 60,
  },
};
