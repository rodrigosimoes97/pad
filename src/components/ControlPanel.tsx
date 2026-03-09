import { PAD_PRESETS, type PadPresetId } from '../audio/presets';
import { getStructureLabel, type PadStructure } from '../utils/notes';
import { SliderControl } from './SliderControl';

type ControlPanelProps = {
  isPlaying: boolean;
  octave: number;
  structure: PadStructure;
  preset: PadPresetId;
  volume: number;
  reverb: number;
  brightness: number;
  hold: boolean;
  advancedOpen: boolean;
  onStart: () => void;
  onStop: () => void;
  onPanic: () => void;
  onFadeOut: () => void;
  onToggleHold: () => void;
  onToggleAdvanced: () => void;
  onOctaveChange: (value: number) => void;
  onStructureChange: (value: PadStructure) => void;
  onPresetChange: (value: PadPresetId) => void;
  onVolumeChange: (value: number) => void;
  onReverbChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
};

export const ControlPanel = ({
  isPlaying,
  octave,
  structure,
  preset,
  volume,
  reverb,
  brightness,
  hold,
  advancedOpen,
  onStart,
  onStop,
  onPanic,
  onFadeOut,
  onToggleHold,
  onToggleAdvanced,
  onOctaveChange,
  onStructureChange,
  onPresetChange,
  onVolumeChange,
  onReverbChange,
  onBrightnessChange
}: ControlPanelProps) => (
  <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
    <div className="grid grid-cols-3 gap-2">
      <button className="btn-primary" type="button" onClick={onStart}>Start</button>
      <button className="btn-muted" type="button" disabled={!isPlaying} onClick={onStop}>Stop</button>
      <button className="btn-danger" type="button" onClick={onPanic}>Panic</button>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <button className="btn-muted" type="button" onClick={onFadeOut} disabled={!isPlaying}>Fade Out</button>
      <button className="btn-muted" type="button" onClick={onToggleHold}>
        Hold: {hold ? 'On' : 'Off'}
      </button>
    </div>

    <div className="grid grid-cols-3 gap-2">
      <select className="input" value={octave} onChange={(e) => onOctaveChange(Number(e.target.value))} aria-label="Oitava">
        {[2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>Oct {value}</option>
        ))}
      </select>
      <select className="input" value={structure} onChange={(e) => onStructureChange(e.target.value as PadStructure)} aria-label="Estrutura">
        {(['root', 'root5', 'root58'] as PadStructure[]).map((value) => (
          <option key={value} value={value}>{getStructureLabel(value)}</option>
        ))}
      </select>
      <select className="input" value={preset} onChange={(e) => onPresetChange(e.target.value as PadPresetId)} aria-label="Preset">
        {Object.values(PAD_PRESETS).map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </div>

    <SliderControl label="Volume" value={volume} onChange={onVolumeChange} />

    <button className="w-full rounded-xl border border-white/15 bg-slate-800/80 px-4 py-2 text-sm text-slate-200" type="button" onClick={onToggleAdvanced}>
      {advancedOpen ? 'Ocultar ajustes avançados' : 'Mostrar ajustes avançados'}
    </button>

    {advancedOpen && (
      <div className="space-y-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
        <SliderControl label="Reverb" value={reverb} onChange={onReverbChange} />
        <SliderControl label="Brightness" value={brightness} onChange={onBrightnessChange} />
      </div>
    )}
  </section>
);
