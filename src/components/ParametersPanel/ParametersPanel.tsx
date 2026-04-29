import type { SceneParams } from '../../types/params';
import styles from './ParametersPanel.module.css';

interface Props {
  params: SceneParams;
  generating: boolean;
  onChange: (params: SceneParams) => void;
  onGenerate: () => void;
  onExport: () => void;
}

function Slider({
  label, value, min, max, step = 0.01, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className={styles.value}>{value % 1 === 0 ? value : value.toFixed(2)}</span>
    </label>
  );
}

export function ParametersPanel({ params, generating, onChange, onGenerate, onExport }: Props) {
  const t = params.terrain;
  const w = params.water;
  const a = params.atmosphere;
  const v = params.vegetation;
  const cl = params.clouds;

  const setTerrain = (patch: Partial<typeof t>) =>
    onChange({ ...params, terrain: { ...t, ...patch } });
  const setWater = (patch: Partial<typeof w>) =>
    onChange({ ...params, water: { ...w, ...patch } });
  const setAtmo = (patch: Partial<typeof a>) =>
    onChange({ ...params, atmosphere: { ...a, ...patch } });
  const setVeg = (patch: Partial<typeof v>) =>
    onChange({ ...params, vegetation: { ...v, ...patch } });
  const setClouds = (patch: Partial<typeof cl>) =>
    onChange({ ...params, clouds: { ...cl, ...patch } });

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>VistaPro Web</span>
      </div>

      <section className={styles.section}>
        <h3>Terrain</h3>
        <label className={styles.row}>
          <span className={styles.label}>Seed</span>
          <input
            type="number"
            className={styles.numberInput}
            value={t.seed}
            onChange={(e) => setTerrain({ seed: parseInt(e.target.value) || 0 })}
          />
        </label>
        <label className={styles.row}>
          <span className={styles.label}>Resolution</span>
          <select
            className={styles.select}
            value={t.size}
            onChange={(e) => setTerrain({ size: parseInt(e.target.value) as 256 | 512 | 1024 })}
          >
            <option value={256}>256 (fast)</option>
            <option value={512}>512 (default)</option>
            <option value={1024}>1024 (slow)</option>
          </select>
        </label>
        <Slider label="Height Scale" value={t.heightScale} min={20} max={200} step={1} onChange={(v) => setTerrain({ heightScale: v })} />
        <Slider label="Scale" value={t.scale} min={100} max={1000} step={10} onChange={(v) => setTerrain({ scale: v })} />
        <Slider label="Octaves" value={t.octaves} min={1} max={10} step={1} onChange={(v) => setTerrain({ octaves: v })} />
        <Slider label="Persistence" value={t.persistence} min={0.1} max={0.9} onChange={(v) => setTerrain({ persistence: v })} />
        <Slider label="Lacunarity" value={t.lacunarity} min={1.2} max={4.0} onChange={(v) => setTerrain({ lacunarity: v })} />
      </section>

      <section className={styles.section}>
        <h3>Water</h3>
        <Slider label="Sea Level" value={w.seaLevel} min={0.05} max={0.65} onChange={(v) => setWater({ seaLevel: v })} />
        <Slider label="Opacity" value={w.opacity} min={0.3} max={1.0} onChange={(v) => setWater({ opacity: v })} />
        <label className={styles.row}>
          <span className={styles.label}>Color</span>
          <input type="color" value={w.color} onChange={(e) => setWater({ color: e.target.value })} />
        </label>
      </section>

      <section className={styles.section}>
        <h3>Vegetation</h3>
        <label className={styles.row}>
          <span className={styles.label}>Trees</span>
          <input
            type="checkbox"
            checked={v.enabled}
            onChange={(e) => setVeg({ enabled: e.target.checked })}
          />
        </label>
        <Slider label="Density" value={v.density} min={0.001} max={0.12} step={0.001} onChange={(val) => setVeg({ density: val })} />
        <Slider label="Min Elev" value={v.minElevation} min={0.1} max={0.6} onChange={(val) => setVeg({ minElevation: val })} />
        <Slider label="Max Elev" value={v.maxElevation} min={0.3} max={0.95} onChange={(val) => setVeg({ maxElevation: val })} />
        <Slider label="Max Slope" value={v.maxSlope} min={0.1} max={0.9} onChange={(val) => setVeg({ maxSlope: val })} />
      </section>

      <section className={styles.section}>
        <h3>Clouds</h3>
        <label className={styles.row}>
          <span className={styles.label}>Enabled</span>
          <input type="checkbox" checked={cl.enabled} onChange={(e) => setClouds({ enabled: e.target.checked })} />
        </label>
        <Slider label="Count" value={cl.count} min={0} max={30} step={1} onChange={(val) => setClouds({ count: val })} />
        <Slider label="Altitude" value={cl.altitude} min={50} max={300} step={5} onChange={(val) => setClouds({ altitude: val })} />
        <Slider label="Opacity" value={cl.opacity} min={0.2} max={1.0} onChange={(val) => setClouds({ opacity: val })} />
        <Slider label="Speed" value={cl.speed} min={0} max={20} step={0.5} onChange={(val) => setClouds({ speed: val })} />
        <label className={styles.row}>
          <span className={styles.label}>Color</span>
          <input type="color" value={cl.color} onChange={(e) => setClouds({ color: e.target.value })} />
        </label>
      </section>

      <section className={styles.section}>
        <h3>Atmosphere</h3>
        <Slider label="Sun Elevation" value={a.sunElevation} min={0} max={90} step={1} onChange={(v) => setAtmo({ sunElevation: v })} />
        <Slider label="Sun Azimuth" value={a.sunAzimuth} min={0} max={360} step={1} onChange={(v) => setAtmo({ sunAzimuth: v })} />
        <Slider label="Sun Intensity" value={a.sunIntensity} min={0} max={3} onChange={(v) => setAtmo({ sunIntensity: v })} />
        <Slider label="Ambient" value={a.ambientIntensity} min={0} max={1.5} onChange={(v) => setAtmo({ ambientIntensity: v })} />
        <Slider label="Haze Near" value={a.hazeNear} min={50} max={500} step={10} onChange={(v) => setAtmo({ hazeNear: v })} />
        <Slider label="Haze Far" value={a.hazeFar} min={100} max={1200} step={10} onChange={(v) => setAtmo({ hazeFar: v })} />
        <label className={styles.row}>
          <span className={styles.label}>Haze Color</span>
          <input type="color" value={a.hazeColor} onChange={(e) => setAtmo({ hazeColor: e.target.value })} />
        </label>
      </section>

      <div className={styles.actions}>
        <button className={styles.generateBtn} onClick={onGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate'}
        </button>
        <button className={styles.exportBtn} onClick={onExport}>
          Export PNG
        </button>
      </div>
    </aside>
  );
}
