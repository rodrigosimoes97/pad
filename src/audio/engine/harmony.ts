import type { HarmonicStructure, KeyNote, Mode } from '../../types/pad';

const NOTE_TO_SEMITONE: Record<KeyNote, number> = {
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
  B: 11,
};

const NOTES = Object.keys(NOTE_TO_SEMITONE) as KeyNote[];

const MAJOR_SECOND = 2;
const MINOR_THIRD = 3;
const MAJOR_THIRD = 4;
const PERFECT_FOURTH = 5;
const PERFECT_FIFTH = 7;
const OCTAVE = 12;

function midiToNoteName(midi: number): string {
  const note = NOTES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function getRootMidi(key: KeyNote, octave: number): number {
  return (octave + 1) * 12 + NOTE_TO_SEMITONE[key];
}

export function buildPadVoices(
  key: KeyNote,
  octave: number,
  mode: Mode,
  structure: HarmonicStructure
): string[] {
  const root = getRootMidi(key, octave);
  const third = mode === 'major' ? MAJOR_THIRD : MINOR_THIRD;

  const intervals: Record<HarmonicStructure, number[]> = {
    root: [0],
    'root-fifth': [0, PERFECT_FIFTH],
    'root-fifth-octave': [0, PERFECT_FIFTH, OCTAVE],
    add2: [0, MAJOR_SECOND, PERFECT_FIFTH],
    sus2: [0, MAJOR_SECOND, PERFECT_FIFTH, OCTAVE],
    sus4: [0, PERFECT_FOURTH, PERFECT_FIFTH, OCTAVE],
    'open-worship': [0, PERFECT_FIFTH, OCTAVE, OCTAVE + third],
  };

  return intervals[structure].map((interval) => midiToNoteName(root + interval));
}
