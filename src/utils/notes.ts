export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type SharpNote = (typeof SHARP_NOTES)[number];
export type DisplayMode = 'sharp' | 'flat';
export type PadStructure = 'root' | 'root5' | 'root58';

const INTERVALS: Record<PadStructure, number[]> = {
  root: [0],
  root5: [0, 7],
  root58: [0, 7, 12]
};

const NOTE_TO_SEMITONE: Record<SharpNote, number> = {
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

export const getDisplayNote = (note: SharpNote, mode: DisplayMode): string => {
  if (mode === 'sharp') return note;
  return FLAT_NOTES[SHARP_NOTES.indexOf(note)];
};

export const getStructureLabel = (structure: PadStructure): string => {
  if (structure === 'root') return 'Root';
  if (structure === 'root5') return '1 + 5';
  return '1 + 5 + 8';
};

export const getPadNotes = (note: SharpNote, octave: number, structure: PadStructure): string[] => {
  const rootMidi = Math.max(36, Math.min(72, (octave + 1) * 12 + NOTE_TO_SEMITONE[note]));
  const notes = INTERVALS[structure].map((interval) => rootMidi + interval);

  if (structure === 'root58' && rootMidi >= 64) {
    notes[2] = rootMidi + 7; // voicing conservador em registros mais altos
  }

  return notes.map(midiToPitch);
};

const midiToPitch = (midi: number): string => {
  const note = SHARP_NOTES[((midi % 12) + 12) % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${note}${oct}`;
};
