import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTerrainMesh, type HeightmapData } from '../terrain/TerrainMesh';
import { buildColorArray } from '../terrain/colorMap';
import { buildWaterPlane } from '../water/WaterPlane';
import { buildLighting } from '../atmosphere/Lighting';
import { buildTreeSystem, TREE_OBJECT_NAMES } from '../vegetation/TreeSystem';
import type { SceneParams } from '../../types/params';

type LightingHandle = ReturnType<typeof buildLighting>;

// Camera far must exceed the sky sphere scale in Lighting.ts
const CAM_FAR = 8000;

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animFrameId = 0;
  private lighting: LightingHandle | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // No tone mapping — Lambert materials don't play well with ACES at low exposure
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    // Fallback background — visible even if Sky fails to render
    this.scene.background = new THREE.Color(0x7ab0d0);

    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.5, CAM_FAR);
    this.camera.position.set(0, 120, 280);
    this.camera.lookAt(0, 20, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 900;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private removeNamed(...names: string[]) {
    names.forEach((name) => {
      const obj = this.scene.getObjectByName(name);
      if (!obj) return;
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else (obj.material as THREE.Material)?.dispose();
      }
    });
  }

  applyScene(data: HeightmapData, params: SceneParams): void {
    this.removeNamed('terrain', 'water', 'sky', ...TREE_OBJECT_NAMES);
    this.scene.children
      .filter((c) => c instanceof THREE.Light)
      .forEach((l) => this.scene.remove(l));

    // Terrain + water — these must succeed
    const terrain = buildTerrainMesh(data, params.terrain, params.water);
    this.scene.add(terrain);
    const water = buildWaterPlane(params.water, params.terrain, params.terrain.heightScale);
    this.scene.add(water);

    // Lighting + sky
    try {
      this.lighting = buildLighting(this.scene, params.atmosphere);
    } catch (e) {
      console.error('[SceneManager] buildLighting failed:', e);
      // Fall back to simple lighting so terrain is visible
      const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
      sun.position.set(200, 400, 300);
      this.scene.add(sun);
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    }

    // Trees — isolated so a crash here doesn't kill terrain
    try {
      buildTreeSystem(data.heights, data.normals, params.terrain, params.vegetation, params.water)
        .forEach((m) => this.scene.add(m));
    } catch (e) {
      console.error('[SceneManager] buildTreeSystem failed:', e);
    }

    this.camera.fov = params.camera.fov;
    this.camera.updateProjectionMatrix();
  }

  updateAtmosphere(params: SceneParams): void {
    try {
      this.lighting?.updateLighting(params.atmosphere);
    } catch (e) {
      console.error('[SceneManager] updateAtmosphere failed:', e);
    }
  }

  updateWater(data: HeightmapData, params: SceneParams): void {
    this.removeNamed('water');
    const water = buildWaterPlane(params.water, params.terrain, params.terrain.heightScale);
    this.scene.add(water);

    const terrain = this.scene.getObjectByName('terrain') as THREE.Mesh | undefined;
    if (terrain) {
      const colors = buildColorArray(data.heights, data.size, data.heightScale, params.water.seaLevel);
      terrain.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      terrain.geometry.attributes.color.needsUpdate = true;
    }
  }

  updateVegetation(data: HeightmapData, params: SceneParams): void {
    this.removeNamed(...TREE_OBJECT_NAMES);
    try {
      buildTreeSystem(data.heights, data.normals, params.terrain, params.vegetation, params.water)
        .forEach((m) => this.scene.add(m));
    } catch (e) {
      console.error('[SceneManager] updateVegetation failed:', e);
    }
  }

  start(): void {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      this.controls.update();
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (e) {
        console.error('[SceneManager] render error:', e);
      }
    };
    animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
  }

  exportImage(width = 1920, height = 1080): string {
    const canvas = this.renderer.domElement;
    const origW = canvas.clientWidth;
    const origH = canvas.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const dataUrl = canvas.toDataURL('image/png');
    this.renderer.setSize(origW, origH, false);
    this.camera.aspect = origW / origH;
    this.camera.updateProjectionMatrix();
    return dataUrl;
  }
}
