export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type SharpNote = (typeof SHARP_NOTES)[number];
export type DisplayMode = 'sharp' | 'flat';
export type PadStructure = 'root' | 'root5' | 'root58';

const SEMITONES_BY_SHARP: Record<SharpNote, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11
};

export const displayNote = (note: SharpNote, mode: DisplayMode): string => {
  if (mode === 'sharp') return note;
  const idx = SHARP_NOTES.indexOf(note);
  return FLAT_NOTES[idx];
};

export const toPitch = (note: SharpNote, octave: number): string => `${note}${octave}`;

export const buildPadNotes = (note: SharpNote, octave: number, structure: PadStructure): string[] => {
  const midiRoot = (octave + 1) * 12 + SEMITONES_BY_SHARP[note];
  const safeRoot = Math.min(72, Math.max(36, midiRoot));

  const base = [safeRoot];
  if (structure === 'root5' || structure === 'root58') base.push(safeRoot + 7);
  if (structure === 'root58') base.push(safeRoot + 12);

  return base.map(midiToPitch);
};

const midiToPitch = (midi: number): string => {
  const noteIndex = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_NOTES[noteIndex]}${oct}`;
};
