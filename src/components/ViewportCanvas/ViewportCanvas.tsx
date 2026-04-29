import { useEffect, useRef } from 'react';
import { SceneManager } from '../../engine/scene/SceneManager';
import type { HeightmapData } from '../../engine/terrain/TerrainMesh';
import type { SceneParams } from '../../types/params';
import styles from './ViewportCanvas.module.css';

interface Props {
  heightmapData: HeightmapData | null;
  params: SceneParams;
  onSceneReady: (mgr: SceneManager) => void;
}

export function ViewportCanvas({ heightmapData, params, onSceneReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  // Keep a ref to latest params so effects can read without re-running
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!canvasRef.current) return;
    const mgr = new SceneManager(canvasRef.current);
    managerRef.current = mgr;
    mgr.start();
    onSceneReady(mgr);
    return () => mgr.stop();
  }, []);

  // Full rebuild when new heightmap arrives
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.applyScene(heightmapData, paramsRef.current);
  }, [heightmapData]);

  // Live atmosphere (sun, fog, sky) — instant, no geometry rebuild
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.updateAtmosphere(paramsRef.current);
  }, [params.atmosphere]);

  // Live water — rebuild water plane + recolor terrain vertices
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.updateWater(heightmapData, paramsRef.current);
  }, [params.water]);

  // Live vegetation — re-place trees without re-generating terrain
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.updateVegetation(heightmapData, paramsRef.current);
  }, [params.vegetation]);

  // Live clouds — rebuild cloud meshes (fast, no heightmap needed)
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.updateClouds(paramsRef.current);
  }, [params.clouds]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
