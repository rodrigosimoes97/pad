import { useEffect, useMemo, useState } from 'react';
import { padEngine } from './audio/padEngine';
import { PAD_PRESETS } from './audio/presets';
import { ControlPanel } from './components/ControlPanel';
import { PerformancePadGrid } from './components/PerformancePadGrid';
import { StatusBar } from './components/StatusBar';
import { StudioPanel } from './components/StudioPanel';
import { usePadSettings } from './hooks/usePadSettings';
import { getDisplayNote, getStructureLabel, type SharpNote } from './utils/notes';

function App() {
  const { state, setSettings, setControls, setDisplayMode, setMode, setAdvancedOpen } = usePadSettings();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    padEngine.setVolume(state.controls.volume);
  }, [state.controls.volume]);

  useEffect(() => {
    padEngine.setReverbAmount(state.controls.reverb);
  }, [state.controls.reverb]);

  useEffect(() => {
    padEngine.setBrightness(state.controls.brightness);
  }, [state.controls.brightness]);

  useEffect(() => {
    padEngine.setHold(state.controls.hold);
  }, [state.controls.hold]);

  const title = useMemo(() => `${getDisplayNote(state.settings.note, state.displayMode)} ${state.settings.octave}`, [state]);

  const subtitle = useMemo(
    () => `${getStructureLabel(state.settings.structure)} • ${PAD_PRESETS[state.settings.preset].label}`,
    [state.settings.structure, state.settings.preset]
  );

  const start = async () => {
    await padEngine.startPad(state.settings);
    setIsPlaying(true);
  };

  const updateAndMaybePlay = async (next: typeof state.settings) => {
    setSettings(next);
    if (padEngine.isPlaying()) {
      await padEngine.updatePad(next);
      setIsPlaying(true);
    }
  };

  const pickNote = async (note: SharpNote) => {
    const next = { ...state.settings, note };
    setSettings(next);

    if (padEngine.isPlaying()) {
      await padEngine.updatePad(next);
      setIsPlaying(true);
      return;
    }

    await padEngine.startPad(next);
    setIsPlaying(true);
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-3 px-3 pb-8 pt-4 text-white sm:px-4 sm:pt-6">
      <StatusBar title={title} subtitle={subtitle} status={isPlaying ? 'PLAYING' : 'STOPPED'} />

      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-2">
        <button
          type="button"
          onClick={() => setMode('performance')}
          className={`mode-btn ${state.mode === 'performance' ? 'mode-btn-active' : ''}`}
        >
          Performance
        </button>
        <button type="button" onClick={() => setMode('studio')} className={`mode-btn ${state.mode === 'studio' ? 'mode-btn-active' : ''}`}>
          Studio
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <PerformancePadGrid currentNote={state.settings.note} displayMode={state.displayMode} onSelect={(n) => void pickNote(n)} />

          {state.mode === 'studio' && (
            <StudioPanel
              note={state.settings.note}
              octave={state.settings.octave}
              structure={state.settings.structure}
              preset={state.settings.preset}
              displayMode={state.displayMode}
              onDisplayModeChange={setDisplayMode}
              onNoteChange={(note) => void updateAndMaybePlay({ ...state.settings, note })}
              onOctaveChange={(octave) => void updateAndMaybePlay({ ...state.settings, octave })}
              onStructureChange={(structure) => void updateAndMaybePlay({ ...state.settings, structure })}
              onPresetChange={(preset) => void updateAndMaybePlay({ ...state.settings, preset })}
            />
          )}
        </section>

        <ControlPanel
          isPlaying={isPlaying}
          octave={state.settings.octave}
          structure={state.settings.structure}
          preset={state.settings.preset}
          volume={state.controls.volume}
          reverb={state.controls.reverb}
          brightness={state.controls.brightness}
          hold={state.controls.hold}
          advancedOpen={state.advancedOpen}
          onStart={() => void start()}
          onStop={() => {
            padEngine.stopPad();
            setIsPlaying(false);
          }}
          onPanic={() => {
            void padEngine.panic();
            setIsPlaying(false);
          }}
          onFadeOut={() => {
            padEngine.fadeOut();
            setIsPlaying(false);
          }}
          onToggleHold={() => setControls({ ...state.controls, hold: !state.controls.hold })}
          onToggleAdvanced={() => setAdvancedOpen(!state.advancedOpen)}
          onOctaveChange={(octave) => void updateAndMaybePlay({ ...state.settings, octave })}
          onStructureChange={(structure) => void updateAndMaybePlay({ ...state.settings, structure })}
          onPresetChange={(preset) => void updateAndMaybePlay({ ...state.settings, preset })}
          onVolumeChange={(volume) => setControls({ ...state.controls, volume })}
          onReverbChange={(reverb) => setControls({ ...state.controls, reverb })}
          onBrightnessChange={(brightness) => setControls({ ...state.controls, brightness })}
        />
      </div>

      <footer className="text-center text-xs text-slate-400">Toque em Start (ou em um pad) para liberar o áudio no navegador.</footer>
    </main>
  );
}

export default App;
