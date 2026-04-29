import { useState, useRef, useCallback, useEffect } from 'react';
import { ViewportCanvas } from './components/ViewportCanvas/ViewportCanvas';
import { ParametersPanel } from './components/ParametersPanel/ParametersPanel';
import type { SceneManager } from './engine/scene/SceneManager';
import type { HeightmapData } from './engine/terrain/TerrainMesh';
import type { SceneParams } from './types/params';
import { defaultParams } from './types/params';
import styles from './App.module.css';

let workerRequestId = 0;

export default function App() {
  const [params, setParams] = useState<SceneParams>(defaultParams);
  const [heightmapData, setHeightmapData] = useState<HeightmapData | null>(null);
  const [generating, setGenerating] = useState(false);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingIdRef = useRef<number>(-1);

  useEffect(() => {
    const worker = new Worker(new URL('./engine/terrain/generator.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent) => {
      const { heights, normals, size, heightScale, id } = e.data;
      if (id !== pendingIdRef.current) return;
      setHeightmapData({ heights, normals, size, heightScale });
      setGenerating(false);
    };

    workerRef.current = worker;
    generate(defaultParams, worker);

    return () => worker.terminate();
  }, []);

  function generate(p: SceneParams, worker?: Worker) {
    const w = worker ?? workerRef.current;
    if (!w) return;
    const id = ++workerRequestId;
    pendingIdRef.current = id;
    setGenerating(true);
    w.postMessage({ params: p.terrain, id });
  }

  const handleGenerate = useCallback(() => generate(params), [params]);

  const handleExport = useCallback(() => {
    const mgr = sceneManagerRef.current;
    if (!mgr) return;
    const dataUrl = mgr.exportImage(1920, 1080);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `landscape-${params.terrain.seed}.png`;
    a.click();
  }, [params.terrain.seed]);

  const handleSceneReady = useCallback((mgr: SceneManager) => {
    sceneManagerRef.current = mgr;
  }, []);

  return (
    <div className={styles.app}>
      <ParametersPanel
        params={params}
        generating={generating}
        onChange={setParams}
        onGenerate={handleGenerate}
        onExport={handleExport}
      />
      <main className={styles.viewport}>
        <ViewportCanvas
          heightmapData={heightmapData}
          params={params}
          onSceneReady={handleSceneReady}
        />
        {generating && (
          <div className={styles.generatingOverlay}>Generating terrain…</div>
        )}
      </main>
    </div>
  );
}
