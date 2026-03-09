import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'base' | 'atmospheric' | 'open';

type PadSettings = {
  note: string;
  octave: number;
  structure: PadStructure;
  preset: PadPresetName;
};

type PadLayer = {
  synthMain: Tone.PolySynth<Tone.Synth>;
  synthAir: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  gain: Tone.Gain;
  lfo: Tone.LFO;
  notesMain: string[];
  notesAir: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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

  return (octave + 1) * 12 + map[note];
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function buildNotes(note: string, octave: number, structure: PadStructure): string[] {
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
  private unlocked = false;
  private playingState = false;

  private currentSettings: PadSettings = {
    note: 'C',
    octave: 3,
    structure: 'root',
    preset: 'base',
  };

  private volume = 0.72;
  private reverbAmount = 0.5;
  private chorusAmount = 0.35;
  private modulationAmount = 0.3;
  private reverseAmount = 0.2;
  private brightness = 0.55;

  private activeLayer: PadLayer | null = null;
  private masterGain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;

  get isPlaying(): boolean {
    return this.playingState;
  }

  get activeNote(): string | null {
    return this.playingState ? this.currentSettings.note : null;
  }

  private getPresetShape(preset: PadPresetName) {
    if (preset === 'atmospheric') {
      return {
        mainOsc: 'triangle' as const,
        airOsc: 'sine' as const,
        attack: 2.1,
        release: 5.2,
        filterBase: 1200,
        mainGain: 0.52,
        airGain: 0.22,
      };
    }

    if (preset === 'open') {
      return {
        mainOsc: 'triangle' as const,
        airOsc: 'triangle' as const,
        attack: 1.5,
        release: 4.3,
        filterBase: 1650,
        mainGain: 0.5,
        airGain: 0.18,
      };
    }

    return {
      mainOsc: 'triangle' as const,
      airOsc: 'sine' as const,
      attack: 1.8,
      release: 4.8,
      filterBase: 1400,
      mainGain: 0.54,
      airGain: 0.2,
    };
  }

  private getFilterFrequency(preset: PadPresetName) {
    const shape = this.getPresetShape(preset);
    return shape.filterBase + this.brightness * 1800;
  }

  private getTargetGain(preset: PadPresetName) {
    const shape = this.getPresetShape(preset);
    return this.volume * (shape.mainGain + shape.airGain * 0.4);
  }

  private async initIfNeeded() {
    if (this.initialized) return;

    this.masterGain = new Tone.Gain(0.9);
    this.limiter = new Tone.Limiter(-2);

    this.masterGain.connect(this.limiter);
    this.limiter.toDestination();

    this.initialized = true;
  }

  async ensureStartedFromGesture(): Promise<void> {
    await this.initIfNeeded();

    if (!this.unlocked) {
      await Tone.start();
      this.unlocked = true;
    }
  }

  private createLayer(settings: PadSettings): PadLayer {
    if (!this.masterGain) {
      throw new Error('Audio engine not initialized');
    }

    const shape = this.getPresetShape(settings.preset);
    const notesMain = buildNotes(settings.note, settings.octave, settings.structure);
    const notesAir = buildNotes(settings.note, settings.octave + 1, settings.structure);
    const filterFrequency = this.getFilterFrequency(settings.preset);

    const synthMain = new Tone.PolySynth(Tone.Synth, {
      volume: -10,
      oscillator: { type: shape.mainOsc },
      envelope: {
        attack: shape.attack,
        decay: 0.2,
        sustain: 0.94,
        release: shape.release,
      },
    });

    const synthAir = new Tone.PolySynth(Tone.Synth, {
      volume: -18,
      oscillator: { type: shape.airOsc },
      envelope: {
        attack: shape.attack + 0.3,
        decay: 0.15,
        sustain: 0.82,
        release: shape.release + 0.8,
      },
    });

    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: filterFrequency,
      rolloff: -12,
      Q: 0.7,
    });

    const chorus = new Tone.Chorus({
      frequency: 0.5 + this.modulationAmount * 0.8,
      delayTime: 3.5,
      depth: 0.2 + this.chorusAmount * 0.55,
      wet: this.chorusAmount,
    }).start();

    const reverb = new Tone.Reverb({
      decay: 5 + this.reverbAmount * 5 + this.reverseAmount * 2,
      preDelay: 0.02 + this.reverseAmount * 0.14,
      wet: this.reverbAmount,
    });

    const delay = new Tone.FeedbackDelay({
      delayTime: 0.18 + this.reverseAmount * 0.12,
      feedback: 0.08 + this.reverseAmount * 0.18,
      wet: this.reverseAmount * 0.22,
    });

    const gain = new Tone.Gain(0);

    synthMain.chain(filter, chorus, reverb, delay, gain, this.masterGain);
    synthAir.chain(filter, chorus, reverb, delay, gain, this.masterGain);

    const lfo = new Tone.LFO({
      frequency: 0.03 + this.modulationAmount * 0.3,
      min: filterFrequency * (1 - 0.04 - this.modulationAmount * 0.08),
      max: filterFrequency * (1 + 0.04 + this.modulationAmount * 0.1),
    });

    lfo.connect(filter.frequency);
    lfo.start();

    return {
      synthMain,
      synthAir,
      filter,
      chorus,
      reverb,
      delay,
      gain,
      lfo,
      notesMain,
      notesAir,
    };
  }

  private disposeLayer(layer: PadLayer, delayMs = 1400) {
    window.setTimeout(() => {
      layer.lfo.dispose();
      layer.synthMain.dispose();
      layer.synthAir.dispose();
      layer.filter.dispose();
      layer.chorus.dispose();
      layer.reverb.dispose();
      layer.delay.dispose();
      layer.gain.dispose();
    }, delayMs);
  }

  async startOrUpdate(
    note: string,
    octave: number,
    structure: PadStructure,
    preset: PadPresetName
  ): Promise<void> {
    await this.ensureStartedFromGesture();

    const nextSettings: PadSettings = { note, octave, structure, preset };
    const nextLayer = this.createLayer(nextSettings);
    const now = Tone.now();

    nextLayer.synthMain.triggerAttack(nextLayer.notesMain, now);
    nextLayer.synthAir.triggerAttack(nextLayer.notesAir, now);

    nextLayer.gain.gain.setValueAtTime(0, now);
    nextLayer.gain.gain.rampTo(this.getTargetGain(preset), 0.35);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.cancelScheduledValues(now);
      this.activeLayer.gain.gain.rampTo(0, 0.35);
      this.activeLayer.synthMain.triggerRelease(this.activeLayer.notesMain, now + 0.02);
      this.activeLayer.synthAir.triggerRelease(this.activeLayer.notesAir, now + 0.02);
      this.disposeLayer(this.activeLayer);
    }

    this.activeLayer = nextLayer;
    this.currentSettings = nextSettings;
    this.playingState = true;
  }

  async updateSettings(partial: Partial<PadSettings>): Promise<void> {
    this.currentSettings = {
      ...this.currentSettings,
      ...partial,
    };

    if (this.playingState) {
      await this.startOrUpdate(
        this.currentSettings.note,
        this.currentSettings.octave,
        this.currentSettings.structure,
        this.currentSettings.preset
      );
    }
  }

  stop(): void {
    if (!this.activeLayer) {
      this.playingState = false;
      return;
    }

    const now = Tone.now();

    this.activeLayer.gain.gain.cancelScheduledValues(now);
    this.activeLayer.gain.gain.rampTo(0, 0.45);
    this.activeLayer.synthMain.triggerRelease(this.activeLayer.notesMain, now + 0.02);
    this.activeLayer.synthAir.triggerRelease(this.activeLayer.notesAir, now + 0.02);

    this.disposeLayer(this.activeLayer);
    this.activeLayer = null;
    this.playingState = false;
  }

  setVolume(value: number): void {
    this.volume = clamp(value, 0, 1);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.rampTo(this.getTargetGain(this.currentSettings.preset), 0.12);
    }
  }

  setReverbAmount(value: number): void {
    this.reverbAmount = clamp(value, 0, 1);

    if (this.activeLayer) {
      this.activeLayer.reverb.wet.rampTo(this.reverbAmount, 0.12);
      this.activeLayer.reverb.decay = 5 + this.reverbAmount * 5 + this.reverseAmount * 2;
    }
  }

  setChorusAmount(value: number): void {
    this.chorusAmount = clamp(value, 0, 1);

    if (this.activeLayer) {
      this.activeLayer.chorus.wet.rampTo(this.chorusAmount, 0.12);
      this.activeLayer.chorus.depth = 0.2 + this.chorusAmount * 0.55;
    }
  }

  setModulationAmount(value: number): void {
    this.modulationAmount = clamp(value, 0, 1);

    if (this.activeLayer) {
      const filterFrequency = this.getFilterFrequency(this.currentSettings.preset);
      this.activeLayer.lfo.frequency.value = 0.03 + this.modulationAmount * 0.3;
      this.activeLayer.lfo.min = filterFrequency * (1 - 0.04 - this.modulationAmount * 0.08);
      this.activeLayer.lfo.max = filterFrequency * (1 + 0.04 + this.modulationAmount * 0.1);
    }
  }

  setReverseAmount(value: number): void {
    this.reverseAmount = clamp(value, 0, 1);

    if (this.activeLayer) {
      this.activeLayer.delay.wet.rampTo(this.reverseAmount * 0.22, 0.12);
      this.activeLayer.delay.feedback.rampTo(0.08 + this.reverseAmount * 0.18, 0.12);
      this.activeLayer.delay.delayTime.rampTo(0.18 + this.reverseAmount * 0.12, 0.12);
      this.activeLayer.reverb.preDelay = 0.02 + this.reverseAmount * 0.14;
      this.activeLayer.reverb.decay = 5 + this.reverbAmount * 5 + this.reverseAmount * 2;
    }
  }

  setBrightness(value: number): void {
    this.brightness = clamp(value, 0, 1);

    if (this.activeLayer) {
      this.activeLayer.filter.frequency.rampTo(
        this.getFilterFrequency(this.currentSettings.preset),
        0.12
      );
    }
  }
}

export const padEngine = new PadEngine();
