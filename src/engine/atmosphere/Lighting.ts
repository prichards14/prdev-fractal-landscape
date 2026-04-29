import * as THREE from 'three';
import type { AtmosphereParams } from '../../types/params';

export function buildLighting(scene: THREE.Scene, params: AtmosphereParams): {
  sun: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  updateLighting: (p: AtmosphereParams) => void;
} {
  const ambient = new THREE.AmbientLight(0xffffff, params.ambientIntensity);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, params.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 2000;
  sun.shadow.camera.left = -400;
  sun.shadow.camera.right = 400;
  sun.shadow.camera.top = 400;
  sun.shadow.camera.bottom = -400;
  scene.add(sun);

  function setSunPosition(p: AtmosphereParams) {
    const elRad = (p.sunElevation * Math.PI) / 180;
    const azRad = (p.sunAzimuth * Math.PI) / 180;
    const dist = 800;
    sun.position.set(
      dist * Math.cos(elRad) * Math.sin(azRad),
      dist * Math.sin(elRad),
      dist * Math.cos(elRad) * Math.cos(azRad)
    );
    sun.intensity = p.sunIntensity;
    ambient.intensity = p.ambientIntensity;
  }

  setSunPosition(params);

  return { sun, ambient, updateLighting: setSunPosition };
}

export function buildFog(scene: THREE.Scene, params: AtmosphereParams): void {
  scene.fog = new THREE.Fog(
    new THREE.Color(params.hazeColor),
    params.hazeNear,
    params.hazeFar
  );
}

export function updateFog(scene: THREE.Scene, params: AtmosphereParams): void {
  if (scene.fog instanceof THREE.Fog) {
    (scene.fog as THREE.Fog).color.set(params.hazeColor);
    (scene.fog as THREE.Fog).near = params.hazeNear;
    (scene.fog as THREE.Fog).far = params.hazeFar;
  }
}
