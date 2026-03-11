import { useEffect, useMemo, useRef, useState } from 'react';
import { PadEngine } from './audio/engine/PadEngine';
import { WORSHIP_PRESETS } from './audio/presets/worshipPresets';
import { KEYS, type FadeTime, type HarmonicStructure, type Mode, type MotionLevel, type PadSettings, type ReverbType, type WorshipPresetName } from './types/pad';
import { saveSettings, loadSettings } from './utils/settingsStorage';

const STRUCTURES: Array<{ value: HarmonicStructure; label: string }> = [
  { value: 'root', label: 'Root' },
  { value: 'root-fifth', label: 'Root + 5' },
  { value: 'root-fifth-octave', label: 'Root + 5 + 8' },
  { value: 'add2', label: 'Add2' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' },
  { value: 'open-worship', label: 'Open Worship' },
];

const REVERBS: ReverbType[] = ['hall', 'church', 'cathedral', 'ambient'];
const MOTIONS: MotionLevel[] = ['off', 'slow', 'medium', 'deep'];
const FADES_IN: FadeTime[] = [0.5, 1, 2, 4];
const FADES_OUT: FadeTime[] = [1, 2, 4, 6];

const engine = new PadEngine(loadSettings());

const section = 'rounded-2xl border border-white/10 bg-slate-900/75 p-3 shadow-xl';

export default function App() {
  const [settings, setSettings] = useState<PadSettings>(engine.settings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(true);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const ignoreKeyboard = useRef(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const applySettings = async (patch: Partial<PadSettings>) => {
    const next = { ...settings, ...patch, layers: { ...settings.layers, ...patch.layers } };
    setSettings(next);
    await engine.updateSettings(patch);
  };

  const onStart = async () => {
    setLoadingAudio(true);
    await engine.ensureStartedFromGesture();
    await engine.start(settings);
    setAudioReady(true);
    setLoadingAudio(false);
    setIsPlaying(true);
  };

  const onSmoothStop = () => {
    engine.smoothStop();
    setIsPlaying(false);
  };

  const onPanic = () => {
    engine.panic();
    setIsPlaying(false);
  };

  const onPadTap = async (key: PadSettings['key']) => {
    setLoadingAudio(true);
    await engine.ensureStartedFromGesture();
    const nextPlaying = await engine.playOrToggle(key);
    setAudioReady(true);
    setLoadingAudio(false);
    setIsPlaying(nextPlaying);
    if (nextPlaying) {
      setSettings((prev) => ({ ...prev, key }));
    }
  };

  const status = useMemo(() => (isPlaying ? 'AO VIVO' : 'PARADO'), [isPlaying]);

  useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target?.matches('input, select, textarea');
      if (ignoreKeyboard.current || isInput) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (isPlaying) onSmoothStop();
        else await onStart();
      }

      if (event.key === 'Escape') {
        onPanic();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const idx = KEYS.indexOf(settings.key);
        const key = KEYS[(idx + 1) % KEYS.length];
        await onPadTap(key);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const idx = KEYS.indexOf(settings.key);
        const key = KEYS[(idx - 1 + KEYS.length) % KEYS.length];
        await onPadTap(key);
      }

      if (/^[1-8]$/.test(event.key)) {
        const presetList = Object.keys(WORSHIP_PRESETS) as WorshipPresetName[];
        const preset = presetList[Number(event.key) - 1];
        if (preset) {
          await applySettings({ preset, ...WORSHIP_PRESETS[preset] });
        }
      }
    };

    const wrapped = (event: KeyboardEvent) => void handler(event);
    window.addEventListener('keydown', wrapped);
    return () => window.removeEventListener('keydown', wrapped);
  }, [settings, isPlaying]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 pb-8 pt-4">
        <header className={`${section} flex items-center justify-between`}>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-violet-200/80">Church Pad Player · Stage Edition</p>
            <p className="text-2xl font-black">{settings.key} {settings.mode === 'major' ? 'Major' : 'Minor'}</p>
          </div>
          <div className="text-right">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPlaying ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{status}</span>
            <p className="mt-2 text-xs text-slate-400">{audioReady ? 'Áudio pronto' : 'Toque em Start para liberar áudio'}</p>
          </div>
        </header>

        <section className={`${section} grid grid-cols-2 gap-2 sm:grid-cols-4`}>
          <button className="btn-primary" onClick={() => void onStart()}>Start</button>
          <button className="btn-muted" onClick={onSmoothStop}>Smooth Stop</button>
          <button className="btn-danger" onClick={onPanic}>Panic</button>
          <button className={`btn-muted ${settings.hold ? 'bg-amber-500 text-black' : ''}`} onClick={() => void applySettings({ hold: !settings.hold })}>Hold</button>
        </section>

        <section className={section}>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Key / Mode / Structure</h2>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            <select className="input" value={settings.key} onChange={(e) => void applySettings({ key: e.target.value as PadSettings['key'] })}>
              {KEYS.map((key) => <option key={key}>{key}</option>)}
            </select>
            <select className="input" value={settings.mode} onChange={(e) => void applySettings({ mode: e.target.value as Mode })}>
              <option value="major">Major</option><option value="minor">Minor</option>
            </select>
            <select className="input col-span-2" value={settings.structure} onChange={(e) => void applySettings({ structure: e.target.value as HarmonicStructure })}>
              {STRUCTURES.map((structure) => <option key={structure.value} value={structure.value}>{structure.label}</option>)}
            </select>
            <select className="input" value={settings.octave} onChange={(e) => void applySettings({ octave: Number(e.target.value) })}>
              {[2, 3, 4, 5].map((oct) => <option key={oct} value={oct}>{oct}</option>)}
            </select>
            <select className="input" value={settings.motion} onChange={(e) => void applySettings({ motion: e.target.value as MotionLevel })}>
              {MOTIONS.map((motion) => <option key={motion} value={motion}>{motion}</option>)}
            </select>
          </div>
        </section>

        <section className={section}>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Worship Presets</h2>
          <select
            className="input"
            value={settings.preset}
            onChange={(e) => {
              const preset = e.target.value as WorshipPresetName;
              void applySettings({ preset, ...WORSHIP_PRESETS[preset] });
            }}
          >
            {(Object.keys(WORSHIP_PRESETS) as WorshipPresetName[]).map((name) => <option key={name} value={name}>{WORSHIP_PRESETS[name].label}</option>)}
          </select>
        </section>

        <section className={section}>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Layer Mixer</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['warm', 'shimmer', 'choir', 'low'] as const).map((layer) => (
              <label className="text-xs text-slate-300" key={layer}>{layer.toUpperCase()}
                <input className="w-full" type="range" min="0" max="1" step="0.01" value={settings.layers[layer]} onChange={(e) => void applySettings({ layers: { ...settings.layers, [layer]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </section>

        <section className={section}>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">FX</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs">Master
              <input className="w-full" type="range" min="0" max="0.9" step="0.01" value={settings.masterVolume} onChange={(e) => void applySettings({ masterVolume: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Brightness
              <input className="w-full" type="range" min="0.7" max="1.4" step="0.01" value={settings.brightness} onChange={(e) => void applySettings({ brightness: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Reverb Mix
              <input className="w-full" type="range" min="0" max="0.8" step="0.01" value={settings.reverbMix} onChange={(e) => void applySettings({ reverbMix: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Reverb Type
              <select className="input mt-1" value={settings.reverbType} onChange={(e) => void applySettings({ reverbType: e.target.value as ReverbType })}>
                {REVERBS.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className={section}>
          <button className="btn-muted w-full" onClick={() => setAdvancedOpen((v) => !v)}>{advancedOpen ? 'Ocultar Studio Panel' : 'Abrir Studio Panel'}</button>
          {advancedOpen && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs">Fade In
                <select className="input mt-1" value={settings.fadeIn} onChange={(e) => void applySettings({ fadeIn: Number(e.target.value) as FadeTime })}>{FADES_IN.map((v) => <option key={v} value={v}>{v}s</option>)}</select>
              </label>
              <label className="text-xs">Fade Out
                <select className="input mt-1" value={settings.fadeOut} onChange={(e) => void applySettings({ fadeOut: Number(e.target.value) as FadeTime })}>{FADES_OUT.map((v) => <option key={v} value={v}>{v}s</option>)}</select>
              </label>
            </div>
          )}
        </section>

        <section className={section}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Performance Grid</h2>
            <button className="btn-muted" onClick={() => setPerformanceMode((v) => !v)}>{performanceMode ? 'Studio View' : 'Performance View'}</button>
          </div>
          <div className={`grid gap-2 ${performanceMode ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-6'}`}>
            {KEYS.map((key) => (
              <button key={key} onClick={() => void onPadTap(key)} className={`rounded-xl border px-3 py-4 text-lg font-black ${settings.key === key && isPlaying ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/10 bg-slate-800 text-slate-100'}`}>{key}</button>
            ))}
          </div>
        </section>

        {loadingAudio && <p className="text-center text-xs text-violet-200">Carregando áudio...</p>}
      </div>
    </div>
  );
}
