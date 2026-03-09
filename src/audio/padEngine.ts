import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'soft' | 'warm' | 'bright';
type PadOscillator = 'sine' | 'triangle' | 'sawtooth';

type PadPresetConfig = {
  oscillator: PadOscillator;
  filterFrequency: number;
  filterQ: number;
  chorusFrequency: number;
  chorusDelayTime: number;
  chorusDepth: number;
  chorusWet: number;
  reverbDecay: number;
  reverbWet: number;
  attack: number;
  release: number;
  gain: number;
};

const PAD_PRESETS: Record<PadPresetName, PadPresetConfig> = {
  soft: {
    oscillator: 'sine',
    filterFrequency: 900,
    filterQ: 0.6,
    chorusFrequency: 0.8,
    chorusDelayTime: 3.5,
    chorusDepth: 0.35,
    chorusWet: 0.25,
    reverbDecay: 6,
    reverbWet: 0.35,
    attack: 1.8,
    release: 2.8,
    gain: 0.55,
  },
  warm: {
    oscillator: 'triangle',
    filterFrequency: 1200,
    filterQ: 0.8,
    chorusFrequency: 1.2,
    chorusDelayTime: 4,
    chorusDepth: 0.45,
    chorusWet: 0.3,
    reverbDecay: 7,
    reverbWet: 0.4,
    attack: 1.4,
    release: 3.2,
    gain: 0.6,
  },
  bright: {
    oscillator: 'sawtooth',
    filterFrequency: 1800,
    filterQ: 1.1,
    chorusFrequency: 1.6,
    chorusDelayTime: 2.5,
    chorusDepth: 0.28,
    chorusWet: 0.18,
    reverbDecay: 5,
    reverbWet: 0.28,
    attack: 1.1,
    release: 2.2,
    gain: 0.48,
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
  const rootMidi = getMidi(note, octave);

  switch (structure) {
    case 'root':
      return [midiToNoteName(rootMidi)];
    case 'root-fifth':
      return [midiToNoteName(rootMidi), midiToNoteName(rootMidi + 7)];
    case 'root-fifth-octave':
      return [
        midiToNoteName(rootMidi),
        midiToNoteName(rootMidi + 7),
        midiToNoteName(rootMidi + 12),
      ];
    default:
      return [midiToNoteName(rootMidi)];
  }
}

export class PadEngine {
  private synth: Tone.PolySynth<Tone.Synth> | null = null;
  private filter: Tone.Filter | null = null;
  private chorus: Tone.Chorus | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;

  private initialized = false;
  private playingState = false;
  private currentNotes: string[] = [];
  private currentVolume = 0.7;
  private currentPreset: PadPresetName = 'soft';

  get isPlaying(): boolean {
    return this.playingState;
  }

  get activeNotes(): string[] {
    return [...this.currentNotes];
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 1000,
      rolloff: -12,
      Q: 0.7,
    });

    this.chorus = new Tone.Chorus({
      frequency: 1.2,
      delayTime: 4,
      depth: 0.4,
      wet: 0.25,
    }).start();

    this.reverb = new Tone.Reverb({
      decay: 6,
      wet: 0.35,
      preDelay: 0.02,
    });

    this.gain = new Tone.Gain(0);
    this.limiter = new Tone.Limiter(-3);

    this.synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 1.6,
        decay: 0.3,
        sustain: 0.9,
        release: 3,
      },
      volume: -8,
    });

    this.synth.chain(
      this.filter,
      this.chorus,
      this.reverb,
      this.gain,
      this.limiter,
      Tone.Destination
    );

    this.applyPreset(this.currentPreset);
    this.setVolume(this.currentVolume);

    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (
      !this.initialized ||
      !this.synth ||
      !this.filter ||
      !this.chorus ||
      !this.reverb ||
      !this.gain ||
      !this.limiter
    ) {
      throw new Error('PadEngine not initialized. Call init() first.');
    }
  }

  applyPreset(presetName: PadPresetName): void {
    this.currentPreset = presetName;

    if (!this.synth || !this.filter || !this.chorus || !this.reverb || !this.gain) {
      return;
    }

    const preset = PAD_PRESETS[presetName];

    this.synth.set({
      oscillator: { type: preset.oscillator },
      envelope: {
        attack: preset.attack,
        decay: 0.3,
        sustain: 0.9,
        release: preset.release,
      },
    });

    this.filter.frequency.rampTo(preset.filterFrequency, 0.2);
    this.filter.Q.rampTo(preset.filterQ, 0.2);

    this.chorus.frequency.rampTo(preset.chorusFrequency, 0.2);
    this.chorus.delayTime = preset.chorusDelayTime;
    this.chorus.depth = preset.chorusDepth;
    this.chorus.wet.rampTo(preset.chorusWet, 0.2);

    this.reverb.decay = preset.reverbDecay;
    this.reverb.wet.rampTo(preset.reverbWet, 0.2);

    this.gain.gain.rampTo(this.currentVolume * preset.gain, 0.2);
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));

    if (!this.gain) return;

    const preset = PAD_PRESETS[this.currentPreset];
    this.gain.gain.rampTo(this.currentVolume * preset.gain, 0.15);
  }

  async start(
    note: string,
    octave: number,
    structure: PadStructure,
    preset: PadPresetName
  ): Promise<void> {
    await this.init();
    this.ensureInitialized();

    const notes = buildPadNotes(note, octave, structure);

    this.applyPreset(preset);

    if (this.playingState && this.currentNotes.length > 0) {
      this.synth!.triggerRelease(this.currentNotes, Tone.now());
    }

    this.currentNotes = notes;
    this.synth!.triggerAttack(notes, Tone.now());
    this.playingState = true;
  }

  async startOrUpdate(
    note: string,
    octave: number,
    structure: PadStructure,
    preset: PadPresetName
  ): Promise<void> {
    await this.start(note, octave, structure, preset);
  }

  stop(): void {
    if (!this.synth || !this.playingState) return;

    if (this.currentNotes.length > 0) {
      this.synth.triggerRelease(this.currentNotes, Tone.now());
    }

    this.currentNotes = [];
    this.playingState = false;
  }

  panic(): void {
    if (this.synth) {
      this.synth.releaseAll();
    }

    if (this.gain) {
      this.gain.gain.rampTo(0, 0.05);
    }

    this.currentNotes = [];
    this.playingState = false;

    window.setTimeout(() => {
      if (this.gain) {
        const preset = PAD_PRESETS[this.currentPreset];
        this.gain.gain.rampTo(this.currentVolume * preset.gain, 0.1);
      }
    }, 80);
  }
}

export const padEngine = new PadEngine();
