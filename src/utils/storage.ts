import type { PadPresetId } from '../audio/presets';
import type { DisplayMode, PadStructure, SharpNote } from './notes';

export type PadSettings = {
  note: SharpNote;
  octave: number;
  structure: PadStructure;
  preset: PadPresetId;
  volume: number;
  displayMode: DisplayMode;
};

const KEY = 'church-pad-player-settings-v1';

export const defaultSettings: PadSettings = {
  note: 'C',
  octave: 3,
  structure: 'root58',
  preset: 'warm',
  volume: 0.6,
  displayMode: 'sharp'
};

export const loadSettings = (): PadSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<PadSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: PadSettings): void => {
  localStorage.setItem(KEY, JSON.stringify(settings));
};
