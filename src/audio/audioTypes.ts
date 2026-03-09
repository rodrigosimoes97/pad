import type { PadPresetId } from './presets';
import type { PadStructure, SharpNote } from '../utils/notes';

export type PadSettings = {
  note: SharpNote;
  octave: number;
  structure: PadStructure;
  preset: PadPresetId;
};

export type LiveControls = {
  volume: number;
  reverb: number;
  brightness: number;
  hold: boolean;
};
