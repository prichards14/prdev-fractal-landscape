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

  // Initialize scene manager once
  useEffect(() => {
    if (!canvasRef.current) return;
    const mgr = new SceneManager(canvasRef.current);
    managerRef.current = mgr;
    mgr.start();
    onSceneReady(mgr);
    return () => mgr.stop();
  }, []);

  // Apply new heightmap whenever it arrives
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.applyScene(heightmapData, params);
  }, [heightmapData]);

  // Live-update atmosphere without re-generating terrain
  useEffect(() => {
    if (!managerRef.current || !heightmapData) return;
    managerRef.current.updateAtmosphere(params);
  }, [params.atmosphere]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
