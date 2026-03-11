import type { MotionLevel, ReverseAtmosphereLevel, ReversePreDelay, ReverbType, WorshipPresetName } from '../../types/pad';

export type PresetDefinition = {
  label: string;
  layers: {
    warm: number;
    shimmer: number;
    choir: number;
    low: number;
  };
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
  envelope: {
    attack: number;
    release: number;
  };
  stereoWidth: number;
};

export const WORSHIP_PRESETS: Record<WorshipPresetName, PresetDefinition> = {
  'legacy-soft': { label: 'Soft (Legacy)', layers: { warm: 0.7, shimmer: 0.2, choir: 0.25, low: 0.25 }, motion: 'slow', reverbType: 'hall', reverbMix: 0.35, reverseAtmosphere: 'off', reverseMix: 0.12, reverseTone: 0.38, reversePreDelay: 'medium', reverseWidth: 0.55, reverseDucking: true, brightness: 0.95, envelope: { attack: 1.8, release: 3.6 }, stereoWidth: 0.55 },
  'legacy-warm': { label: 'Warm (Legacy)', layers: { warm: 0.75, shimmer: 0.3, choir: 0.4, low: 0.4 }, motion: 'slow', reverbType: 'church', reverbMix: 0.42, reverseAtmosphere: 'off', reverseMix: 0.12, reverseTone: 0.38, reversePreDelay: 'medium', reverseWidth: 0.55, reverseDucking: true, brightness: 1, envelope: { attack: 1.5, release: 3.8 }, stereoWidth: 0.62 },
  'legacy-bright': { label: 'Bright (Legacy)', layers: { warm: 0.52, shimmer: 0.5, choir: 0.32, low: 0.22 }, motion: 'medium', reverbType: 'hall', reverbMix: 0.34, reverseAtmosphere: 'off', reverseMix: 0.12, reverseTone: 0.38, reversePreDelay: 'medium', reverseWidth: 0.55, reverseDucking: true, brightness: 1.2, envelope: { attack: 1.1, release: 2.7 }, stereoWidth: 0.65 },
  'legacy-shimmer': { label: 'Shimmer (Legacy)', layers: { warm: 0.46, shimmer: 0.78, choir: 0.6, low: 0.2 }, motion: 'medium', reverbType: 'ambient', reverbMix: 0.58, reverseAtmosphere: 'light', reverseMix: 0.16, reverseTone: 0.54, reversePreDelay: 'short', reverseWidth: 0.7, reverseDucking: false, brightness: 1.25, envelope: { attack: 2.2, release: 4.7 }, stereoWidth: 0.72 },
  'legacy-deep': { label: 'Deep (Legacy)', layers: { warm: 0.68, shimmer: 0.12, choir: 0.25, low: 0.58 }, motion: 'off', reverbType: 'church', reverbMix: 0.32, reverseAtmosphere: 'off', reverseMix: 0.12, reverseTone: 0.38, reversePreDelay: 'medium', reverseWidth: 0.55, reverseDucking: true, brightness: 0.82, envelope: { attack: 1.6, release: 4.2 }, stereoWidth: 0.45 },
  'bethel-style': { label: 'Atmospheric Worship A', layers: { warm: 0.64, shimmer: 0.55, choir: 0.6, low: 0.3 }, motion: 'medium', reverbType: 'cathedral', reverbMix: 0.54, reverseAtmosphere: 'light', reverseMix: 0.16, reverseTone: 0.48, reversePreDelay: 'medium', reverseWidth: 0.75, reverseDucking: true, brightness: 1.12, envelope: { attack: 2.6, release: 5 }, stereoWidth: 0.77 },
  'hills-style': { label: 'Atmospheric Worship B', layers: { warm: 0.72, shimmer: 0.42, choir: 0.52, low: 0.28 }, motion: 'slow', reverbType: 'church', reverbMix: 0.46, reverseAtmosphere: 'light', reverseMix: 0.14, reverseTone: 0.4, reversePreDelay: 'medium', reverseWidth: 0.68, reverseDucking: true, brightness: 1, envelope: { attack: 2, release: 4.1 }, stereoWidth: 0.68 },
  'elevation-style': { label: 'Atmospheric Worship C', layers: { warm: 0.62, shimmer: 0.62, choir: 0.55, low: 0.36 }, motion: 'deep', reverbType: 'cathedral', reverbMix: 0.57, reverseAtmosphere: 'medium', reverseMix: 0.22, reverseTone: 0.58, reversePreDelay: 'medium', reverseWidth: 0.84, reverseDucking: true, brightness: 1.18, envelope: { attack: 2.3, release: 5.6 }, stereoWidth: 0.8 },
  'prayer-pad': { label: 'Prayer Pad', layers: { warm: 0.76, shimmer: 0.34, choir: 0.58, low: 0.3 }, motion: 'slow', reverbType: 'church', reverbMix: 0.5, reverseAtmosphere: 'light', reverseMix: 0.2, reverseTone: 0.5, reversePreDelay: 'medium', reverseWidth: 0.74, reverseDucking: true, brightness: 0.92, envelope: { attack: 2.4, release: 5.4 }, stereoWidth: 0.63 },
  'soaking-pad': { label: 'Soaking Pad', layers: { warm: 0.65, shimmer: 0.66, choir: 0.72, low: 0.24 }, motion: 'deep', reverbType: 'ambient', reverbMix: 0.62, reverseAtmosphere: 'medium', reverseMix: 0.24, reverseTone: 0.56, reversePreDelay: 'long', reverseWidth: 0.82, reverseDucking: true, brightness: 1.08, envelope: { attack: 3.2, release: 6 }, stereoWidth: 0.84 },
  'warm-support': { label: 'Warm Piano Support', layers: { warm: 0.84, shimmer: 0.18, choir: 0.28, low: 0.42 }, motion: 'off', reverbType: 'hall', reverbMix: 0.3, reverseAtmosphere: 'off', reverseMix: 0.12, reverseTone: 0.38, reversePreDelay: 'medium', reverseWidth: 0.55, reverseDucking: true, brightness: 0.86, envelope: { attack: 1.4, release: 3.2 }, stereoWidth: 0.48 },
  'deep-night': { label: 'Deep Night Pad', layers: { warm: 0.6, shimmer: 0.2, choir: 0.4, low: 0.66 }, motion: 'slow', reverbType: 'cathedral', reverbMix: 0.47, reverseAtmosphere: 'light', reverseMix: 0.19, reverseTone: 0.42, reversePreDelay: 'long', reverseWidth: 0.8, reverseDucking: true, brightness: 0.78, envelope: { attack: 2.1, release: 5 }, stereoWidth: 0.52 },
  'bright-air': { label: 'Bright Worship Air', layers: { warm: 0.45, shimmer: 0.82, choir: 0.5, low: 0.2 }, motion: 'medium', reverbType: 'ambient', reverbMix: 0.55, reverseAtmosphere: 'light', reverseMix: 0.18, reverseTone: 0.72, reversePreDelay: 'short', reverseWidth: 0.88, reverseDucking: false, brightness: 1.3, envelope: { attack: 1.8, release: 4.6 }, stereoWidth: 0.85 },
};
