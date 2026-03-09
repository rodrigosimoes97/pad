export type PadPresetId = 'soft' | 'warm' | 'bright';

export type PadPreset = {
  id: PadPresetId;
  label: string;
  synth: {
    volume: number;
    oscillator: { type: string; spread: number; count: number };
    envelope: { attack: number; decay: number; sustain: number; release: number };
    filterEnvelope: { attack: number; decay: number; sustain: number; release: number; baseFrequency: number; octaves: number };
  };
  filter: { frequency: number; rolloff: -12 | -24 | -48 | -96; q: number };
  chorus: { frequency: number; delayTime: number; depth: number; wet: number };
  reverb: { decay: number; preDelay: number; wet: number };
};

export const PAD_PRESETS: Record<PadPresetId, PadPreset> = {
  soft: {
    id: 'soft',
    label: 'Soft Pad',
    synth: {
      volume: -13,
      oscillator: { type: 'fatsine', spread: 30, count: 3 },
      envelope: { attack: 2.8, decay: 1.6, sustain: 0.9, release: 3.8 },
      filterEnvelope: { attack: 2.4, decay: 1.2, sustain: 0.7, release: 3, baseFrequency: 180, octaves: 2.1 }
    },
    filter: { frequency: 1500, rolloff: -24, q: 0.5 },
    chorus: { frequency: 0.35, delayTime: 6, depth: 0.45, wet: 0.3 },
    reverb: { decay: 6, preDelay: 0.06, wet: 0.28 }
  },
  warm: {
    id: 'warm',
    label: 'Warm Pad',
    synth: {
      volume: -11,
      oscillator: { type: 'fatsawtooth', spread: 22, count: 3 },
      envelope: { attack: 2.2, decay: 1.4, sustain: 0.82, release: 3.4 },
      filterEnvelope: { attack: 1.8, decay: 1.1, sustain: 0.74, release: 2.8, baseFrequency: 230, octaves: 2.8 }
    },
    filter: { frequency: 1800, rolloff: -24, q: 0.8 },
    chorus: { frequency: 0.26, delayTime: 5.2, depth: 0.6, wet: 0.34 },
    reverb: { decay: 7.2, preDelay: 0.04, wet: 0.3 }
  },
  bright: {
    id: 'bright',
    label: 'Bright Pad',
    synth: {
      volume: -12,
      oscillator: { type: 'fattriangle', spread: 18, count: 4 },
      envelope: { attack: 1.9, decay: 1.3, sustain: 0.78, release: 3.1 },
      filterEnvelope: { attack: 1.4, decay: 1, sustain: 0.75, release: 2.4, baseFrequency: 320, octaves: 3.2 }
    },
    filter: { frequency: 2400, rolloff: -24, q: 1 },
    chorus: { frequency: 0.45, delayTime: 4.2, depth: 0.56, wet: 0.36 },
    reverb: { decay: 5.8, preDelay: 0.03, wet: 0.24 }
  }
};
