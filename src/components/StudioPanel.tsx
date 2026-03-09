import type { PadPresetId } from '../audio/presets';
import { FLAT_NOTES, SHARP_NOTES, getStructureLabel, type DisplayMode, type PadStructure, type SharpNote } from '../utils/notes';

type StudioPanelProps = {
  note: SharpNote;
  octave: number;
  structure: PadStructure;
  preset: PadPresetId;
  displayMode: DisplayMode;
  onNoteChange: (value: SharpNote) => void;
  onOctaveChange: (value: number) => void;
  onStructureChange: (value: PadStructure) => void;
  onPresetChange: (value: PadPresetId) => void;
  onDisplayModeChange: (value: DisplayMode) => void;
};

export const StudioPanel = ({
  note,
  octave,
  structure,
  preset,
  displayMode,
  onNoteChange,
  onOctaveChange,
  onStructureChange,
  onPresetChange,
  onDisplayModeChange
}: StudioPanelProps) => (
  <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-2">
    <label className="space-y-1 text-sm text-slate-300">
      Exibição
      <select className="input" value={displayMode} onChange={(e) => onDisplayModeChange(e.target.value as DisplayMode)}>
        <option value="sharp">Sustenidos</option>
        <option value="flat">Bemóis</option>
      </select>
    </label>
    <label className="space-y-1 text-sm text-slate-300">
      Nota
      <select className="input" value={note} onChange={(e) => onNoteChange(e.target.value as SharpNote)}>
        {SHARP_NOTES.map((sharp, idx) => (
          <option key={sharp} value={sharp}>{displayMode === 'flat' ? FLAT_NOTES[idx] : sharp}</option>
        ))}
      </select>
    </label>
    <label className="space-y-1 text-sm text-slate-300">
      Oitava
      <select className="input" value={octave} onChange={(e) => onOctaveChange(Number(e.target.value))}>
        {[2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <label className="space-y-1 text-sm text-slate-300">
      Estrutura
      <select className="input" value={structure} onChange={(e) => onStructureChange(e.target.value as PadStructure)}>
        {(['root', 'root5', 'root58'] as PadStructure[]).map((value) => (
          <option key={value} value={value}>{getStructureLabel(value)}</option>
        ))}
      </select>
    </label>
    <label className="space-y-1 text-sm text-slate-300 sm:col-span-2">
      Preset
      <select className="input" value={preset} onChange={(e) => onPresetChange(e.target.value as PadPresetId)}>
        <option value="soft">Soft Pad</option>
        <option value="warm">Warm Pad</option>
        <option value="bright">Bright Pad</option>
        <option value="shimmer">Shimmer Pad</option>
        <option value="deep">Deep Pad</option>
      </select>
    </label>
  </section>
);
