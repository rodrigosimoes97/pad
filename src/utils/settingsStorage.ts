import { DEFAULT_SETTINGS, KEYS, type PadSettings } from '../types/pad';

const STORAGE_KEY = 'church-pad-player-v2';

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function loadSettings(): PadSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PadSettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      key: KEYS.includes(parsed.key as (typeof KEYS)[number]) ? (parsed.key as (typeof KEYS)[number]) : DEFAULT_SETTINGS.key,
      masterVolume: isNumber(parsed.masterVolume) ? Math.min(0.9, Math.max(0, parsed.masterVolume)) : DEFAULT_SETTINGS.masterVolume,
      reverbMix: isNumber(parsed.reverbMix) ? Math.min(0.8, Math.max(0, parsed.reverbMix)) : DEFAULT_SETTINGS.reverbMix,
      brightness: isNumber(parsed.brightness) ? Math.min(1.4, Math.max(0.7, parsed.brightness)) : DEFAULT_SETTINGS.brightness,
      layers: {
        warm: isNumber(parsed.layers?.warm) ? Math.min(1, Math.max(0, parsed.layers.warm)) : DEFAULT_SETTINGS.layers.warm,
        shimmer: isNumber(parsed.layers?.shimmer) ? Math.min(1, Math.max(0, parsed.layers.shimmer)) : DEFAULT_SETTINGS.layers.shimmer,
        choir: isNumber(parsed.layers?.choir) ? Math.min(1, Math.max(0, parsed.layers.choir)) : DEFAULT_SETTINGS.layers.choir,
        low: isNumber(parsed.layers?.low) ? Math.min(1, Math.max(0, parsed.layers.low)) : DEFAULT_SETTINGS.layers.low,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PadSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
