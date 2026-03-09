import type { ReactNode } from 'react';
import { PAD_PRESETS, type PadPresetId } from '../audio/presets';
import { FLAT_NOTES, SHARP_NOTES, type DisplayMode, type PadStructure, type SharpNote, getDisplayNote  } from '../utils/notes';

type PadControlsProps = {
  note: SharpNote;
  octave: number;
  structure: PadStructure;
  preset: PadPresetId;
  displayMode: DisplayMode;
  onNoteChange: (note: SharpNote) => void;
  onOctaveChange: (octave: number) => void;
  onStructureChange: (structure: PadStructure) => void;
  onPresetChange: (preset: PadPresetId) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
};

const structureOptions: Array<{ value: PadStructure; label: string }> = [
  { value: 'root', label: 'Root only' },
  { value: 'root5', label: '1 + 5' },
  { value: 'root58', label: '1 + 5 + 8' }
];

export const PadControls = ({
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
}: PadControlsProps) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Exibição enarmônica" id="display-mode">
      <select
        id="display-mode"
        value={displayMode}
        onChange={(event) => onDisplayModeChange(event.target.value as DisplayMode)}
        className="input"
      >
        <option value="sharp">Sustenidos (#)</option>
        <option value="flat">Bemóis (b)</option>
      </select>
    </Field>

    <Field label="Nota / Tônica" id="note">
      <select id="note" value={note} onChange={(event) => onNoteChange(event.target.value as SharpNote)} className="input">
        {SHARP_NOTES.map((sharp, index) => (
          <option key={sharp} value={sharp}>
            {displayMode === 'flat' ? FLAT_NOTES[index] : sharp}
          </option>
        ))}
      </select>
    </Field>

    <Field label="Oitava" id="octave">
      <select id="octave" value={octave} onChange={(event) => onOctaveChange(Number(event.target.value))} className="input">
        {[2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </Field>

    <Field label="Estrutura do pad" id="structure">
      <select
        id="structure"
        value={structure}
        onChange={(event) => onStructureChange(event.target.value as PadStructure)}
        className="input"
      >
        {structureOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>

    <Field label="Preset / Timbre" id="preset">
      <select
        id="preset"
        value={preset}
        onChange={(event) => onPresetChange(event.target.value as PadPresetId)}
        className="input"
      >
        {Object.values(PAD_PRESETS).map((presetOption) => (
          <option key={presetOption.id} value={presetOption.id}>
            {presetOption.label}
          </option>
        ))}
      </select>
    </Field>

    <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
      <p className="font-semibold text-white">Nota atual</p>
      <p className="mt-1 text-lg text-mint">{displayNote(note, displayMode)}</p>
    </div>
  </div>
);

type FieldProps = { id: string; label: string; children: ReactNode };

const Field = ({ id, label, children }: FieldProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm text-slate-200">
      {label}
    </label>
    {children}
  </div>
);
