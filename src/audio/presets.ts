export type PadPresetId = 'soft' | 'warm' | 'bright' | 'shimmer' | 'deep';

export type PadPreset = {
  id: PadPresetId;
  label: string;
  synth: {
    volume: number;
    oscillator: { type: string; spread: number; count: number };
    envelope: { attack: number; decay: number; sustain: number; release: number };
    filterEnvelope: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
      baseFrequency: number;
      octaves: number;
    };
  };
  filterFrequency: number;
  brightnessRange: [number, number];
  chorus: { frequency: number; delayTime: number; depth: number; wet: number };
  reverb: { decay: number; preDelay: number; wet: number };
};

export const PAD_PRESETS: Record<PadPresetId, PadPreset> = {
  soft: {
    id: 'soft',
    label: 'Soft Pad',
    synth: {
      volume: -12,
      oscillator: { type: 'fatsine', spread: 24, count: 3 },
      envelope: { attack: 3.2, decay: 1.6, sustain: 0.9, release: 4.2 },
      filterEnvelope: { attack: 2.4, decay: 1.4, sustain: 0.8, release: 3.6, baseFrequency: 160, octaves: 2.2 }
    },
    filterFrequency: 1450,
    brightnessRange: [800, 2600],
    chorus: { frequency: 0.23, delayTime: 6.2, depth: 0.48, wet: 0.28 },
    reverb: { decay: 8.5, preDelay: 0.07, wet: 0.3 }
  },
  warm: {
    id: 'warm',
    label: 'Warm Pad',
    synth: {
      volume: -11,
      oscillator: { type: 'fatsawtooth', spread: 20, count: 3 },
      envelope: { attack: 2.4, decay: 1.3, sustain: 0.84, release: 3.6 },
      filterEnvelope: { attack: 1.9, decay: 1.2, sustain: 0.78, release: 3.1, baseFrequency: 220, octaves: 2.6 }
    },
    filterFrequency: 1700,
    brightnessRange: [950, 3200],
    chorus: { frequency: 0.28, delayTime: 5.5, depth: 0.56, wet: 0.33 },
    reverb: { decay: 7.5, preDelay: 0.04, wet: 0.26 }
  },
  bright: {
    id: 'bright',
    label: 'Bright Pad',
    synth: {
      volume: -12,
      oscillator: { type: 'fattriangle', spread: 18, count: 4 },
      envelope: { attack: 2.1, decay: 1.1, sustain: 0.79, release: 3.2 },
      filterEnvelope: { attack: 1.5, decay: 1, sustain: 0.76, release: 2.7, baseFrequency: 300, octaves: 3.1 }
    },
    filterFrequency: 2200,
    brightnessRange: [1200, 4200],
    chorus: { frequency: 0.36, delayTime: 4.3, depth: 0.48, wet: 0.3 },
    reverb: { decay: 6.1, preDelay: 0.03, wet: 0.22 }
  },
  shimmer: {
    id: 'shimmer',
    label: 'Shimmer Pad',
    synth: {
      volume: -14,
      oscillator: { type: 'fatsquare', spread: 28, count: 4 },
      envelope: { attack: 3.6, decay: 1.7, sustain: 0.82, release: 5 },
      filterEnvelope: { attack: 2.5, decay: 1.3, sustain: 0.8, release: 4.2, baseFrequency: 360, octaves: 3.4 }
    },
    filterFrequency: 2500,
    brightnessRange: [1500, 5200],
    chorus: { frequency: 0.42, delayTime: 4.8, depth: 0.68, wet: 0.4 },
    reverb: { decay: 10.5, preDelay: 0.06, wet: 0.36 }
  },
  deep: {
    id: 'deep',
    label: 'Deep Pad',
    synth: {
      volume: -10,
      oscillator: { type: 'fatsawtooth', spread: 16, count: 4 },
      envelope: { attack: 2.8, decay: 1.4, sustain: 0.86, release: 4 },
      filterEnvelope: { attack: 2.1, decay: 1.1, sustain: 0.75, release: 3.3, baseFrequency: 130, octaves: 2.1 }
    },
    filterFrequency: 1200,
    brightnessRange: [680, 2200],
    chorus: { frequency: 0.2, delayTime: 6.5, depth: 0.36, wet: 0.24 },
    reverb: { decay: 7.8, preDelay: 0.05, wet: 0.23 }
  }
};
