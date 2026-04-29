import * as THREE from 'three';
import type { WaterParams, TerrainParams } from '../../types/params';

export function buildWaterPlane(water: WaterParams, terrain: TerrainParams, heightScale: number): THREE.Mesh {
  const seaLevelY = water.seaLevel * heightScale;

  const geometry = new THREE.PlaneGeometry(terrain.scale * 1.2, terrain.scale * 1.2);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(water.color),
    transparent: true,
    opacity: water.opacity,
    shininess: 120,
    specular: new THREE.Color(0x99ccff),
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = seaLevelY;
  mesh.name = 'water';
  mesh.receiveShadow = false;

  return mesh;
}
