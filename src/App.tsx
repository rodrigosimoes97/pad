import { useEffect, useMemo, useRef, useState } from 'react';
import { PadEngine, type AudioRuntimeStatus } from './audio/engine/PadEngine';
import { WORSHIP_PRESETS } from './audio/presets/worshipPresets';
import { KEYS, type FadeTime, type HarmonicStructure, type Mode, type MotionLevel, type PadSettings, type ReverseAtmosphereLevel, type ReversePreDelay, type ReverbType, type WorshipPresetName } from './types/pad';
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
const REVERSE_LEVELS: ReverseAtmosphereLevel[] = ['off', 'light', 'medium', 'deep'];
const REVERSE_PRE_DELAYS: ReversePreDelay[] = ['short', 'medium', 'long'];

const engine = new PadEngine(loadSettings());

const section = 'rounded-2xl border border-white/10 bg-slate-900/75 p-3 shadow-xl';

const AUDIO_LABELS: Record<AudioRuntimeStatus, string> = {
  locked: 'Locked',
  unlocking: 'Unlocking',
  ready: 'Ready',
  error: 'Error',
};

export default function App() {
  const [settings, setSettings] = useState<PadSettings>(engine.settings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(true);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioRuntimeStatus>(engine.getAudioStatus());
  const [audioError, setAudioError] = useState<string | null>(engine.getAudioError());
  const ignoreKeyboard = useRef(false);

  const syncAudioState = () => {
    setAudioStatus(engine.getAudioStatus());
    setAudioError(engine.getAudioError());
  };

  const unlockAudioIfNeeded = async () => {
    syncAudioState();
    if (engine.getAudioStatus() === 'ready') return true;
    const unlocked = await engine.ensureAudioUnlocked();
    syncAudioState();
    return unlocked;
  };

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      await engine.refreshAudioStateAfterVisibility();
      syncAudioState();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const applySettings = async (patch: Partial<PadSettings>) => {
    const next = { ...settings, ...patch, layers: { ...settings.layers, ...patch.layers } };
    setSettings(next);
    await engine.updateSettings(patch);
  };

  const onStart = async () => {
    console.info('[UI] start clicked');
    setLoadingAudio(true);
    const unlocked = await unlockAudioIfNeeded();
    if (!unlocked) {
      setLoadingAudio(false);
      return;
    }

    if (engine.getAudioContextState() !== 'running') {
      console.info('[UI] engine start blocked: context is not running', engine.getAudioContextState());
      setLoadingAudio(false);
      syncAudioState();
      return;
    }

    await engine.start(settings);
    console.info('[UI] engine start executed');
    setLoadingAudio(false);
    setIsPlaying(true);
    syncAudioState();
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
    const unlocked = await unlockAudioIfNeeded();
    if (!unlocked) {
      setLoadingAudio(false);
      return;
    }
    const nextPlaying = await engine.playOrToggle(key);
    setLoadingAudio(false);
    setIsPlaying(nextPlaying);
    if (nextPlaying) {
      setSettings((prev) => ({ ...prev, key }));
    }
    syncAudioState();
  };

  const onReverseTest = async () => {
    const unlocked = await unlockAudioIfNeeded();
    if (!unlocked) return;
    engine.triggerReverseTest();
  };

  const status = useMemo(() => (isPlaying ? 'PLAYING' : AUDIO_LABELS[audioStatus]), [audioStatus, isPlaying]);

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

      if (event.key === 'Escape') onPanic();

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
        if (preset) await applySettings({ preset, ...WORSHIP_PRESETS[preset] });
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
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPlaying ? 'bg-emerald-400/20 text-emerald-300' : audioStatus === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>{status}</span>
            <p className="mt-2 text-xs text-slate-400">{audioStatus === 'locked' ? 'Tap Start to enable audio' : audioStatus === 'unlocking' ? 'Unlocking audio...' : audioStatus === 'error' ? 'Audio unlock failed' : 'Audio ready'}</p>
            {audioError && <p className="mt-1 text-[11px] text-rose-300">{audioError}</p>}
          </div>
        </header>

        <section className={`${section} grid grid-cols-2 gap-2 sm:grid-cols-5`}>
          <button className="btn-primary" onClick={() => void onStart()}>Start</button>
          <button className="btn-muted" onClick={onSmoothStop}>Smooth Stop</button>
          <button className="btn-danger" onClick={onPanic}>Panic</button>
          <button className={`btn-muted ${settings.hold ? 'bg-amber-500 text-black' : ''}`} onClick={() => void applySettings({ hold: !settings.hold })}>Hold</button>
          <button className="btn-muted" onClick={() => void onReverseTest()}>Test Reverse</button>
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
          <select className="input" value={settings.preset} onChange={(e) => {
            const preset = e.target.value as WorshipPresetName;
            void applySettings({ preset, ...WORSHIP_PRESETS[preset] });
          }}>
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
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Reverse Atmosphere</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="text-xs">Reverse Atmosphere
              <select className="input mt-1" value={settings.reverseAtmosphere} onChange={(e) => void applySettings({ reverseAtmosphere: e.target.value as ReverseAtmosphereLevel })}>
                {REVERSE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="text-xs">Reverse Pre-Delay
              <select className="input mt-1" value={settings.reversePreDelay} onChange={(e) => void applySettings({ reversePreDelay: e.target.value as ReversePreDelay })}>
                {REVERSE_PRE_DELAYS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs flex items-end gap-2">
              <input type="checkbox" checked={settings.reverseDucking} onChange={(e) => void applySettings({ reverseDucking: e.target.checked })} />
              Reverse Ducking
            </label>
            <label className="text-xs flex items-end gap-2">
              <input type="checkbox" checked={settings.reverseDebugSolo} onChange={(e) => void applySettings({ reverseDebugSolo: e.target.checked })} />
              Reverse Debug Solo
            </label>
            <label className="text-xs">Reverse Mix ({Math.round(settings.reverseMix * 100)}%)
              <input className="w-full" type="range" min="0" max="0.7" step="0.01" value={settings.reverseMix} onChange={(e) => void applySettings({ reverseMix: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Reverse Tone
              <input className="w-full" type="range" min="0" max="1" step="0.01" value={settings.reverseTone} onChange={(e) => void applySettings({ reverseTone: Number(e.target.value) })} />
            </label>
            <label className="text-xs">Reverse Width
              <input className="w-full" type="range" min="0" max="1" step="0.01" value={settings.reverseWidth} onChange={(e) => void applySettings({ reverseWidth: Number(e.target.value) })} />
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

        {loadingAudio && <p className="text-center text-xs text-violet-200">Unlocking / loading audio...</p>}
      </div>
    </div>
  );
}
