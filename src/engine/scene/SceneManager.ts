import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTerrainMesh, type HeightmapData } from '../terrain/TerrainMesh';
import { buildWaterPlane } from '../water/WaterPlane';
import { buildLighting, buildFog, updateFog } from '../atmosphere/Lighting';
import type { SceneParams } from '../../types/params';

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animFrameId = 0;
  private lighting: ReturnType<typeof buildLighting> | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ab4d4);

    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.5, 2000);
    this.camera.position.set(0, 120, 280);
    this.camera.lookAt(0, 20, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 800;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go underground

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

  applyScene(heightmapData: HeightmapData, params: SceneParams): void {
    // Remove old terrain/water
    ['terrain', 'water'].forEach((name) => {
      const old = this.scene.getObjectByName(name);
      if (old) {
        this.scene.remove(old);
        (old as THREE.Mesh).geometry.dispose();
        ((old as THREE.Mesh).material as THREE.Material).dispose();
      }
    });

    // Remove old lighting
    this.scene.children
      .filter((c) => c instanceof THREE.Light)
      .forEach((l) => this.scene.remove(l));

    // Terrain
    const terrain = buildTerrainMesh(heightmapData, params.terrain, params.water);
    this.scene.add(terrain);

    // Water
    const water = buildWaterPlane(params.water, params.terrain, params.terrain.heightScale);
    this.scene.add(water);

    // Lighting
    this.lighting = buildLighting(this.scene, params.atmosphere);

    // Fog
    buildFog(this.scene, params.atmosphere);

    // Sky background tinted by haze color
    this.scene.background = new THREE.Color(params.atmosphere.hazeColor).lerp(new THREE.Color(0x5090c0), 0.6);

    // Update camera FOV
    this.camera.fov = params.camera.fov;
    this.camera.updateProjectionMatrix();
  }

  updateAtmosphere(params: SceneParams): void {
    if (this.lighting) {
      this.lighting.updateLighting(params.atmosphere);
    }
    updateFog(this.scene, params.atmosphere);
    this.scene.background = new THREE.Color(params.atmosphere.hazeColor).lerp(new THREE.Color(0x5090c0), 0.6);
  }

  start(): void {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
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
    const origW = this.renderer.domElement.clientWidth;
    const origH = this.renderer.domElement.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    this.renderer.setSize(origW, origH, false);
    this.camera.aspect = origW / origH;
    this.camera.updateProjectionMatrix();
    return dataUrl;
  }
}
