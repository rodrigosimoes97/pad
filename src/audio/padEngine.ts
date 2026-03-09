import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'soft' | 'warm' | 'bright' | 'shimmer' | 'deep';

export type PadSettings = {
  note: string;
  octave: number;
  structure: PadStructure;
  preset: PadPresetName;
};

type SimpleOscillator = 'sine' | 'triangle' | 'sawtooth';

type PadPreset = {
  oscillator: SimpleOscillator;
  attack: number;
  release: number;
  filterFrequency: number;
  filterQ: number;
  chorusWet: number;
  chorusFrequency: number;
  reverbWet: number;
  reverbDecay: number;
  gain: number;
};

type PadLayer = {
  synth: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  gain: Tone.Gain;
  notes: string[];
};

const PRESETS: Record<PadPresetName, PadPreset> = {
  soft: {
    oscillator: 'sine',
    attack: 1.8,
    release: 2.8,
    filterFrequency: 900,
    filterQ: 0.6,
    chorusWet: 0.18,
    chorusFrequency: 0.8,
    reverbWet: 0.35,
    reverbDecay: 6,
    gain: 0.52,
  },
  warm: {
    oscillator: 'triangle',
    attack: 1.4,
    release: 3.1,
    filterFrequency: 1200,
    filterQ: 0.8,
    chorusWet: 0.24,
    chorusFrequency: 1.1,
    reverbWet: 0.38,
    reverbDecay: 7,
    gain: 0.58,
  },
  bright: {
    oscillator: 'sawtooth',
    attack: 1.1,
    release: 2.2,
    filterFrequency: 1800,
    filterQ: 1.0,
    chorusWet: 0.14,
    chorusFrequency: 1.5,
    reverbWet: 0.28,
    reverbDecay: 5,
    gain: 0.42,
  },
  shimmer: {
    oscillator: 'sine',
    attack: 2.1,
    release: 3.4,
    filterFrequency: 2200,
    filterQ: 0.5,
    chorusWet: 0.3,
    chorusFrequency: 1.8,
    reverbWet: 0.48,
    reverbDecay: 9,
    gain: 0.48,
  },
  deep: {
    oscillator: 'triangle',
    attack: 1.6,
    release: 3.6,
    filterFrequency: 700,
    filterQ: 0.9,
    chorusWet: 0.12,
    chorusFrequency: 0.7,
    reverbWet: 0.3,
    reverbDecay: 6.5,
    gain: 0.62,
  },
};

function getMidi(note: string, octave: number): number {
  const map: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  };

  const semitone = map[note];
  if (semitone === undefined) {
    throw new Error(`Invalid note: ${note}`);
  }

  return (octave + 1) * 12 + semitone;
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function buildPadNotes(note: string, octave: number, structure: PadStructure): string[] {
  const root = getMidi(note, octave);

  if (structure === 'root') {
    return [midiToNoteName(root)];
  }

  if (structure === 'root-fifth') {
    return [midiToNoteName(root), midiToNoteName(root + 7)];
  }

  return [midiToNoteName(root), midiToNoteName(root + 7), midiToNoteName(root + 12)];
}

export class PadEngine {
  private initialized = false;
  private activeLayer: PadLayer | null = null;
  private playingState = false;

  private currentSettings: PadSettings = {
    note: 'C',
    octave: 3,
    structure: 'root',
    preset: 'soft',
  };

  private volume = 0.7;
  private reverbAmount = 0.35;
  private brightness = 1;

  private masterGain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;

  get isPlaying(): boolean {
    return this.playingState;
  }

  get settings(): PadSettings {
    return this.currentSettings;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();

    this.masterGain = new Tone.Gain(0.7);
    this.limiter = new Tone.Limiter(-3);

    this.masterGain.connect(this.limiter);
    this.limiter.toDestination();

    this.initialized = true;
  }

  private ensureInitialized(): asserts this is this & {
    masterGain: Tone.Gain;
    limiter: Tone.Limiter;
  } {
    if (!this.initialized || !this.masterGain || !this.limiter) {
      throw new Error('PadEngine not initialized. Call init() first.');
    }
  }

  private createLayer(settings: PadSettings): PadLayer {
    this.ensureInitialized();

    const preset = PRESETS[settings.preset];
    const notes = buildPadNotes(settings.note, settings.octave, settings.structure);

    const synth = new Tone.PolySynth(Tone.Synth, {
      volume: -8,
      oscillator: { type: preset.oscillator },
      envelope: {
        attack: preset.attack,
        decay: 0.25,
        sustain: 0.92,
        release: preset.release,
      },
    });

    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: preset.filterFrequency * this.brightness,
      rolloff: -12,
      Q: preset.filterQ,
    });

    const chorus = new Tone.Chorus({
      frequency: preset.chorusFrequency,
      delayTime: 3.5,
      depth: 0.35,
      wet: preset.chorusWet,
    }).start();

    const reverb = new Tone.Reverb({
      decay: preset.reverbDecay,
      wet: Math.min(1, preset.reverbWet * (this.reverbAmount / 0.35)),
      preDelay: 0.02,
    });

    const gain = new Tone.Gain(0);

    synth.chain(filter, chorus, reverb, gain, this.masterGain);

    return {
      synth,
      filter,
      chorus,
      reverb,
      gain,
      notes,
    };
  }

  private getTargetLayerGain(presetName: PadPresetName): number {
    return this.volume * PRESETS[presetName].gain;
  }

  private disposeLayer(layer: PadLayer, delayMs = 900): void {
    window.setTimeout(() => {
      layer.synth.dispose();
      layer.filter.dispose();
      layer.chorus.dispose();
      layer.reverb.dispose();
      layer.gain.dispose();
    }, delayMs);
  }

  async startPad(settings: PadSettings): Promise<void> {
    await this.init();
    this.ensureInitialized();

    const layer = this.createLayer(settings);
    const now = Tone.now();

    layer.synth.triggerAttack(layer.notes, now);
    layer.gain.gain.setValueAtTime(0, now);
    layer.gain.gain.rampTo(this.getTargetLayerGain(settings.preset), 0.35);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.rampTo(0, 0.35);
      this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.02);
      this.disposeLayer(this.activeLayer);
    }

    this.activeLayer = layer;
    this.currentSettings = settings;
    this.playingState = true;
  }

  async updatePad(settings: PadSettings): Promise<void> {
    if (!this.playingState) {
      await this.startPad(settings);
      return;
    }

    await this.startPad(settings);
  }

  async startOrUpdate(
    note: string,
    octave: number,
    structure: PadStructure,
    preset: PadPresetName
  ): Promise<void> {
    const settings: PadSettings = { note, octave, structure, preset };

    if (this.playingState) {
      await this.updatePad(settings);
      return;
    }

    await this.startPad(settings);
  }

  stopPad(): void {
    if (!this.activeLayer || !this.playingState) return;

    const now = Tone.now();
    this.activeLayer.gain.gain.rampTo(0, 0.4);
    this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.02);
    this.disposeLayer(this.activeLayer);

    this.activeLayer = null;
    this.playingState = false;
  }

  stop(): void {
    this.stopPad();
  }

  panic(): void {
    if (this.activeLayer) {
      this.activeLayer.synth.releaseAll();
      this.activeLayer.gain.gain.cancelScheduledValues(Tone.now());
      this.activeLayer.gain.gain.setValueAtTime(0, Tone.now());
      this.disposeLayer(this.activeLayer, 80);
    }

    this.activeLayer = null;
    this.playingState = false;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));

    if (!this.activeLayer) return;

    this.activeLayer.gain.gain.rampTo(
      this.getTargetLayerGain(this.currentSettings.preset),
      0.12
    );
  }

  setReverbAmount(value: number): void {
    this.reverbAmount = Math.max(0, Math.min(1, value));

    if (!this.activeLayer) return;

    const preset = PRESETS[this.currentSettings.preset];
    this.activeLayer.reverb.wet.rampTo(
      Math.min(1, preset.reverbWet * (this.reverbAmount / 0.35)),
      0.15
    );
  }

  setBrightness(value: number): void {
    this.brightness = Math.max(0.5, Math.min(2, value));

    if (!this.activeLayer) return;

    const preset = PRESETS[this.currentSettings.preset];
    this.activeLayer.filter.frequency.rampTo(
      preset.filterFrequency * this.brightness,
      0.15
    );
  }
}

export const padEngine = new PadEngine();
