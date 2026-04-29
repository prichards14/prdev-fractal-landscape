import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { AtmosphereParams } from '../../types/params';

function sunVector(elev: number, az: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - elev);
  const theta = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

export function buildLighting(scene: THREE.Scene, params: AtmosphereParams): {
  sun: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  sky: Sky;
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

  // Sky shader
  const sky = new Sky();
  sky.scale.setScalar(10000);
  sky.name = 'sky';
  scene.add(sky);

  const skyU = sky.material.uniforms;
  skyU['turbidity'].value = 8;
  skyU['rayleigh'].value = 1.5;
  skyU['mieCoefficient'].value = 0.006;
  skyU['mieDirectionalG'].value = 0.82;

  function apply(p: AtmosphereParams) {
    const sv = sunVector(p.sunElevation, p.sunAzimuth);
    const dist = 800;
    sun.position.copy(sv.clone().multiplyScalar(dist));
    sun.intensity = p.sunIntensity;
    ambient.intensity = p.ambientIntensity;

    skyU['sunPosition'].value.copy(sv);

    // Haze via fog — use hazeColor unless sun is near horizon (warm it up)
    const horizonFactor = Math.max(0, 1 - p.sunElevation / 20);
    const baseHaze = new THREE.Color(p.hazeColor);
    const warmHaze = baseHaze.clone().lerp(new THREE.Color(0xe8b060), horizonFactor * 0.4);
    scene.fog = new THREE.Fog(warmHaze, p.hazeNear, p.hazeFar);
  }

  apply(params);

  return { sun, ambient, sky, updateLighting: apply };
}

export function updateFog(scene: THREE.Scene, params: AtmosphereParams): void {
  if (scene.fog instanceof THREE.Fog) {
    (scene.fog as THREE.Fog).near = params.hazeNear;
    (scene.fog as THREE.Fog).far = params.hazeFar;
  }
}
