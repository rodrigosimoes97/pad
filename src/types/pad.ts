export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type KeyNote = (typeof KEYS)[number];

export type Mode = 'major' | 'minor';
export type MotionLevel = 'off' | 'slow' | 'medium' | 'deep';
export type ReverbType = 'hall' | 'church' | 'cathedral' | 'ambient';
export type ReverseAtmosphereLevel = 'off' | 'light' | 'medium' | 'deep';
export type ReversePreDelay = 'short' | 'medium' | 'long';
export type FadeTime = 0.5 | 1 | 2 | 4 | 6;

export type HarmonicStructure =
  | 'root'
  | 'root-fifth'
  | 'root-fifth-octave'
  | 'add2'
  | 'sus2'
  | 'sus4'
  | 'open-worship';

export type LayerMix = {
  warm: number;
  shimmer: number;
  choir: number;
  low: number;
};

export type WorshipPresetName =
  | 'legacy-soft'
  | 'legacy-warm'
  | 'legacy-bright'
  | 'legacy-shimmer'
  | 'legacy-deep'
  | 'bethel-style'
  | 'hills-style'
  | 'elevation-style'
  | 'prayer-pad'
  | 'soaking-pad'
  | 'warm-support'
  | 'deep-night'
  | 'bright-air';

export type PadSettings = {
  key: KeyNote;
  octave: number;
  mode: Mode;
  structure: HarmonicStructure;
  preset: WorshipPresetName;
  layers: LayerMix;
  motion: MotionLevel;
  reverbType: ReverbType;
  reverbMix: number;
  reverseAtmosphere: ReverseAtmosphereLevel;
  reverseMix: number;
  reverseTone: number;
  reversePreDelay: ReversePreDelay;
  reverseWidth: number;
  reverseDucking: boolean;
  brightness: number;
  masterVolume: number;
  fadeIn: FadeTime;
  fadeOut: FadeTime;
  hold: boolean;
};

export const DEFAULT_LAYER_MIX: LayerMix = {
  warm: 0.72,
  shimmer: 0.38,
  choir: 0.45,
  low: 0.35,
};

export const DEFAULT_SETTINGS: PadSettings = {
  key: 'C',
  octave: 3,
  mode: 'major',
  structure: 'root-fifth-octave',
  preset: 'legacy-warm',
  layers: DEFAULT_LAYER_MIX,
  motion: 'slow',
  reverbType: 'church',
  reverbMix: 0.42,
  reverseAtmosphere: 'light',
  reverseMix: 0.19,
  reverseTone: 0.52,
  reversePreDelay: 'medium',
  reverseWidth: 0.68,
  reverseDucking: true,
  brightness: 1,
  masterVolume: 0.7,
  fadeIn: 1,
  fadeOut: 2,
  hold: false,
};
