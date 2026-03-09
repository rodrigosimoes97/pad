import { useEffect, useMemo, useState } from 'react';
import { padEngine } from './audio/padEngine';
import { PAD_PRESETS } from './audio/presets';
import { PadControls } from './components/PadControls';
import { Slider } from './components/Slider';
import { StatusDisplay } from './components/StatusDisplay';
import { TransportButtons } from './components/TransportButtons';
import { buildPadNotes, displayNote } from './utils/notes';
import { loadSettings, saveSettings, type PadSettings } from './utils/storage';

function App() {
  const [settings, setSettings] = useState<PadSettings>(() => loadSettings());
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const currentLabel = useMemo(() => {
    const display = displayNote(settings.note, settings.displayMode);
    const structureLabel =
      settings.structure === 'root' ? 'Root only' : settings.structure === 'root5' ? '1 + 5' : '1 + 5 + 8';
    return `${display} • ${structureLabel} • ${PAD_PRESETS[settings.preset].label}`;
  }, [settings]);

  const updatePadIfPlaying = async (next: PadSettings): Promise<void> => {
    if (!padEngine.isPlaying) return;
    const notes = buildPadNotes(next.note, next.octave, next.structure);
    await padEngine.startOrUpdate({ notes, preset: next.preset, volume: next.volume });
    setIsPlaying(true);
  };

  const updateSettings = <K extends keyof PadSettings>(key: K, value: PadSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    void updatePadIfPlaying(next);
  };

  const handleStart = async () => {
    const notes = buildPadNotes(settings.note, settings.octave, settings.structure);
    await padEngine.startOrUpdate({ notes, preset: settings.preset, volume: settings.volume });
    setIsPlaying(true);
  };

  const handleStop = () => {
    padEngine.stop();
    setIsPlaying(false);
  };

  const handlePanic = async () => {
    await padEngine.panic();
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      void padEngine.panic();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.35),_rgba(7,9,15,1)_45%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Church Pad Player</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">Pads contínuos, suaves e prontos para uso ao vivo.</p>
        </header>

        <section className="rounded-2xl border border-violet-500/20 bg-card/85 p-5 shadow-glow backdrop-blur sm:p-7">
          <PadControls
            note={settings.note}
            octave={settings.octave}
            structure={settings.structure}
            preset={settings.preset}
            displayMode={settings.displayMode}
            onNoteChange={(note) => updateSettings('note', note)}
            onOctaveChange={(octave) => updateSettings('octave', octave)}
            onStructureChange={(structure) => updateSettings('structure', structure)}
            onPresetChange={(preset) => updateSettings('preset', preset)}
            onDisplayModeChange={(displayMode) => updateSettings('displayMode', displayMode)}
          />

          <div className="mt-5">
            <Slider id="volume" label="Volume" value={settings.volume} min={0} max={1} onChange={(v) => updateSettings('volume', v)} />
          </div>

          <div className="mt-5 space-y-4">
            <StatusDisplay isPlaying={isPlaying} currentLabel={currentLabel} />
            <TransportButtons isPlaying={isPlaying} onStart={() => void handleStart()} onStop={handleStop} onPanic={() => void handlePanic()} />
          </div>

          <footer className="mt-5 text-center text-xs text-slate-400">
            Use Start para liberar o áudio no navegador.
          </footer>
        </section>
      </div>
    </main>
  );
}

export default App;
