import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'soft' | 'warm' | 'bright' | 'shimmer' | 'deep';

export type PadSettings = {
  note: string;
  octave: number;
  structure: PadStructure;
  preset: PadPresetName;
};

type OscType = 'sine' | 'triangle' | 'sawtooth';

type Preset = {
  oscillator: OscType;
  attack: number;
  release: number;
  filterFrequency: number;
  filterQ: number;
  chorusWet: number;
  chorusFrequency: number;
  reverbWet: number;
  reverbRoomSize: number;
  gain: number;
  layerDetune: number;
  layerGain: number;
  modFilterDepth: number;
  modAmpDepth: number;
  modRate: number;
};

type Layer = {
  synth: Tone.PolySynth<Tone.Synth>;
  shimmerSynth?: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  reverb: Tone.JCReverb;
  gain: Tone.Gain;
  filterLfo: Tone.LFO;
  ampLfo: Tone.LFO;
  notes: string[];
};

const PRESETS: Record<PadPresetName, Preset> = {
  soft: {
    oscillator: 'sine',
    attack: 1.9,
    release: 3.1,
    filterFrequency: 1100,
    filterQ: 0.7,
    chorusWet: 0.2,
    chorusFrequency: 0.9,
    reverbWet: 0.36,
    reverbRoomSize: 0.72,
    gain: 0.52,
    layerDetune: 3,
    layerGain: 0,
    modFilterDepth: 90,
    modAmpDepth: 0.015,
    modRate: 0.06,
  },
  warm: {
    oscillator: 'triangle',
    attack: 1.5,
    release: 3.4,
    filterFrequency: 1350,
    filterQ: 0.9,
    chorusWet: 0.24,
    chorusFrequency: 1,
    reverbWet: 0.4,
    reverbRoomSize: 0.78,
    gain: 0.58,
    layerDetune: 5,
    layerGain: 0.3,
    modFilterDepth: 130,
    modAmpDepth: 0.02,
    modRate: 0.055,
  },
  bright: {
    oscillator: 'sawtooth',
    attack: 1.1,
    release: 2.4,
    filterFrequency: 1800,
    filterQ: 1,
    chorusWet: 0.14,
    chorusFrequency: 1.4,
    reverbWet: 0.3,
    reverbRoomSize: 0.64,
    gain: 0.42,
    layerDetune: 1,
    layerGain: 0,
    modFilterDepth: 55,
    modAmpDepth: 0.008,
    modRate: 0.07,
  },
  shimmer: {
    oscillator: 'sine',
    attack: 2.4,
    release: 4.8,
    filterFrequency: 2400,
    filterQ: 0.45,
    chorusWet: 0.34,
    chorusFrequency: 0.65,
    reverbWet: 0.62,
    reverbRoomSize: 0.92,
    gain: 0.5,
    layerDetune: 10,
    layerGain: 0.42,
    modFilterDepth: 220,
    modAmpDepth: 0.025,
    modRate: 0.042,
  },
  deep: {
    oscillator: 'triangle',
    attack: 1.7,
    release: 3.8,
    filterFrequency: 780,
    filterQ: 1,
    chorusWet: 0.11,
    chorusFrequency: 0.7,
    reverbWet: 0.3,
    reverbRoomSize: 0.7,
    gain: 0.62,
    layerDetune: 2,
    layerGain: 0,
    modFilterDepth: 45,
    modAmpDepth: 0.006,
    modRate: 0.04,
  },
};

function getMidi(note: string, octave: number): number {
  const map: Record<string, number> = {
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

  const semitone = map[note];
  if (semitone === undefined) throw new Error(`Invalid note: ${note}`);
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
  if (structure === 'root') return [midiToNoteName(root)];
  if (structure === 'root-fifth') return [midiToNoteName(root), midiToNoteName(root + 7)];
  return [midiToNoteName(root), midiToNoteName(root + 7), midiToNoteName(root + 12)];
}

export class PadEngine {
  private initialized = false;
  private activeLayer: Layer | null = null;
  private playingState = false;
  private audioUnlocked = false;

  private currentSettings: PadSettings = {
    note: 'C',
    octave: 3,
    structure: 'root',
    preset: 'warm',
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

  get isAudioUnlocked(): boolean {
    return this.audioUnlocked;
  }

  async ensureStartedFromGesture(): Promise<void> {
    if (!this.initialized) {
      this.masterGain = new Tone.Gain(0.8);
      this.limiter = new Tone.Limiter(-2);
      this.masterGain.connect(this.limiter);
      this.limiter.toDestination();
      this.initialized = true;
    }

    await Tone.start();
    await Tone.getContext().resume();

    if (!this.audioUnlocked) {
      const warmup = new Tone.Oscillator(440, 'sine').start();
      const gain = new Tone.Gain(0).toDestination();
      warmup.connect(gain);
      warmup.stop('+0.02');
      window.setTimeout(() => {
        warmup.dispose();
        gain.dispose();
      }, 60);
    }

    this.audioUnlocked = true;
  }

  private requireMaster(): Tone.Gain {
    if (!this.masterGain || !this.limiter) {
      throw new Error('PadEngine not initialized. Call ensureStartedFromGesture() first.');
    }
    return this.masterGain;
  }

  private createLayer(settings: PadSettings): Layer {
    const masterGain = this.requireMaster();
    const preset = PRESETS[settings.preset];
    const notes = buildPadNotes(settings.note, settings.octave, settings.structure);

    const synth = new Tone.PolySynth(Tone.Synth, {
      volume: -9,
      oscillator: { type: preset.oscillator },
      envelope: {
        attack: preset.attack,
        decay: 0.4,
        sustain: 0.9,
        release: preset.release,
      },
    });

    const shimmerSynth = preset.layerGain > 0
      ? new Tone.PolySynth(Tone.Synth, {
          volume: -13,
          oscillator: { type: 'triangle' },
          detune: preset.layerDetune,
          envelope: {
            attack: preset.attack + 0.4,
            decay: 0.3,
            sustain: 0.86,
            release: preset.release + 0.8,
          },
        })
      : undefined;

    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: preset.filterFrequency * this.brightness,
      rolloff: -12,
      Q: preset.filterQ,
    });

    const chorus = new Tone.Chorus({
      frequency: preset.chorusFrequency,
      delayTime: 4.2,
      depth: 0.44,
      spread: 160,
      wet: preset.chorusWet,
    }).start();

    const reverb = new Tone.JCReverb({
      roomSize: preset.reverbRoomSize,
      wet: Math.min(1, preset.reverbWet * (this.reverbAmount / 0.35)),
    });

    const gain = new Tone.Gain(0);
    const filterBase = preset.filterFrequency * this.brightness;
    const filterLfo = new Tone.LFO({
      frequency: preset.modRate,
      min: Math.max(250, filterBase - preset.modFilterDepth),
      max: filterBase + preset.modFilterDepth,
    }).start();

    const baseGain = this.getTargetGain(settings.preset);
    const ampLfo = new Tone.LFO({
      frequency: preset.modRate * 0.7,
      min: Math.max(0, baseGain * (1 - preset.modAmpDepth)),
      max: baseGain * (1 + preset.modAmpDepth),
    }).start();

    synth.chain(filter, chorus, reverb, gain, masterGain);
    shimmerSynth?.chain(filter, chorus, reverb, gain, masterGain);
    filterLfo.connect(filter.frequency);
    ampLfo.connect(gain.gain);

    return { synth, shimmerSynth, filter, chorus, reverb, gain, filterLfo, ampLfo, notes };
  }

  private getTargetGain(preset: PadPresetName): number {
    return this.volume * PRESETS[preset].gain;
  }

  private disposeLayer(layer: Layer, delayMs = 1200): void {
    window.setTimeout(() => {
      layer.synth.dispose();
      layer.shimmerSynth?.dispose();
      layer.filter.dispose();
      layer.chorus.dispose();
      layer.reverb.dispose();
      layer.gain.dispose();
      layer.filterLfo.dispose();
      layer.ampLfo.dispose();
    }, delayMs);
  }

  private async startPad(settings: PadSettings): Promise<void> {
    await this.ensureStartedFromGesture();

    const layer = this.createLayer(settings);
    const now = Tone.now();

    layer.synth.triggerAttack(layer.notes, now);
    layer.shimmerSynth?.triggerAttack(layer.notes, now + 0.02);

    layer.gain.gain.setValueAtTime(0, now);
    layer.gain.gain.linearRampToValueAtTime(this.getTargetGain(settings.preset), now + 0.28);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.cancelScheduledValues(now);
      this.activeLayer.gain.gain.linearRampToValueAtTime(0, now + 0.28);
      this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.06);
      this.activeLayer.shimmerSynth?.triggerRelease(this.activeLayer.notes, now + 0.06);
      this.disposeLayer(this.activeLayer);
    }

    this.activeLayer = layer;
    this.currentSettings = settings;
    this.playingState = true;
  }

  async toggleOrSwitchPad(note: string): Promise<boolean> {
    await this.ensureStartedFromGesture();

    if (this.playingState && this.currentSettings.note === note) {
      this.stop();
      return false;
    }

    await this.startPad({ ...this.currentSettings, note });
    return true;
  }

  async updateSettings(nextSettings: Partial<PadSettings>): Promise<void> {
    const merged = { ...this.currentSettings, ...nextSettings };
    this.currentSettings = merged;

    if (this.playingState) {
      await this.startPad(merged);
    }
  }

  stop(): void {
    if (!this.activeLayer || !this.playingState) return;

    const now = Tone.now();
    this.activeLayer.gain.gain.cancelScheduledValues(now);
    this.activeLayer.gain.gain.linearRampToValueAtTime(0, now + 0.35);
    this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.04);
    this.activeLayer.shimmerSynth?.triggerRelease(this.activeLayer.notes, now + 0.04);
    this.disposeLayer(this.activeLayer);

    this.activeLayer = null;
    this.playingState = false;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (!this.activeLayer) return;
    this.activeLayer.gain.gain.rampTo(this.getTargetGain(this.currentSettings.preset), 0.14);
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
    const target = preset.filterFrequency * this.brightness;
    this.activeLayer.filter.frequency.rampTo(target, 0.16);
    this.activeLayer.filterLfo.min = Math.max(250, target - preset.modFilterDepth);
    this.activeLayer.filterLfo.max = target + preset.modFilterDepth;
  }
}

export const padEngine = new PadEngine();
