import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'base' | 'atmospheric' | 'open';

type PadSettings = {
  note: string;
  octave: number;
  structure: PadStructure;
  preset: PadPresetName;
};

type Layer = {
  synth: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  gain: Tone.Gain;
  notes: string[];
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
  private playing = false;

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
  private brightness = 0.5;

  private activeLayer: Layer | null = null;
  private masterGain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  private lfo: Tone.LFO | null = null;

  private getPresetValues(preset: PadPresetName) {
    if (preset === 'atmospheric') {
      return {
        oscillator: 'triangle' as const,
        attack: 1.8,
        release: 4.5,
        filter: 1300,
        gain: 0.52,
      };
    }

    if (preset === 'open') {
      return {
        oscillator: 'sawtooth' as const,
        attack: 1.4,
        release: 3.8,
        filter: 1800,
        gain: 0.46,
      };
    }

    return {
      oscillator: 'triangle' as const,
      attack: 1.6,
      release: 4.2,
      filter: 1100,
      gain: 0.5,
    };
  }

  private async initIfNeeded() {
    if (this.initialized) return;

    this.masterGain = new Tone.Gain(0.8);
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

  private createLayer(settings: PadSettings): Layer {
    if (!this.masterGain) {
      throw new Error('Audio engine not initialized');
    }

    const preset = this.getPresetValues(settings.preset);
    const notes = buildNotes(settings.note, settings.octave, settings.structure);

    const synth = new Tone.PolySynth(Tone.Synth, {
      volume: -10,
      oscillator: { type: preset.oscillator },
      envelope: {
        attack: preset.attack,
        decay: 0.2,
        sustain: 0.95,
        release: preset.release,
      },
    });

    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 700 + preset.filter + this.brightness * 1200,
      rolloff: -12,
      Q: 0.7,
    });

    const chorus = new Tone.Chorus({
      frequency: 0.8 + this.modulationAmount * 1.2,
      delayTime: 3.5,
      depth: 0.25 + this.chorusAmount * 0.5,
      wet: this.chorusAmount,
    }).start();

    const reverb = new Tone.Reverb({
      decay: 5 + this.reverseAmount * 4,
      preDelay: 0.02 + this.reverseAmount * 0.12,
      wet: this.reverbAmount,
    });

    const gain = new Tone.Gain(0);

    synth.chain(filter, chorus, reverb, gain, this.masterGain);

    this.lfo = new Tone.LFO({
      frequency: 0.03 + this.modulationAmount * 0.25,
      min: Math.max(300, (700 + preset.filter + this.brightness * 1200) * 0.88),
      max: (700 + preset.filter + this.brightness * 1200) * 1.08,
    });
    
    this.lfo?.connect(filter.frequency);
    this.lfo?.start();

    return { synth, filter, chorus, reverb, gain, notes };
  }

  private getTargetGain(preset: PadPresetName) {
    return this.volume * this.getPresetValues(preset).gain;
  }

  private disposeLayer(layer: Layer, delayMs = 1200) {
    window.setTimeout(() => {
      layer.synth.dispose();
      layer.filter.dispose();
      layer.chorus.dispose();
      layer.reverb.dispose();
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

    nextLayer.synth.triggerAttack(nextLayer.notes, now);
    nextLayer.gain.gain.setValueAtTime(0, now);
    nextLayer.gain.gain.rampTo(this.getTargetGain(preset), 0.35);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.cancelScheduledValues(now);
      this.activeLayer.gain.gain.rampTo(0, 0.35);
      this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.02);
      this.disposeLayer(this.activeLayer);
    }

    this.activeLayer = nextLayer;
    this.currentSettings = nextSettings;
    this.playing = true;
  }

  async toggleOrSwitchPad(note: string): Promise<boolean> {
    await this.ensureStartedFromGesture();

    const sameNote = this.playing && this.currentSettings.note === note;

    if (sameNote) {
      this.stop();
      return false;
    }

    await this.startOrUpdate(
      note,
      this.currentSettings.octave,
      this.currentSettings.structure,
      this.currentSettings.preset
    );

    return true;
  }

  async updateSettings(partial: Partial<PadSettings>): Promise<void> {
    this.currentSettings = {
      ...this.currentSettings,
      ...partial,
    };

    if (this.playing) {
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
      this.playing = false;
      return;
    }

    const now = Tone.now();
    this.activeLayer.gain.gain.cancelScheduledValues(now);
    this.activeLayer.gain.gain.rampTo(0, 0.4);
    this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.02);
    this.disposeLayer(this.activeLayer);

    this.activeLayer = null;
    this.playing = false;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));

    if (this.activeLayer) {
      this.activeLayer.gain.gain.rampTo(
        this.getTargetGain(this.currentSettings.preset),
        0.12
      );
    }
  }

  setReverbAmount(value: number): void {
    this.reverbAmount = Math.max(0, Math.min(1, value));

    if (this.activeLayer) {
      this.activeLayer.reverb.wet.rampTo(this.reverbAmount, 0.12);
    }
  }

  setChorusAmount(value: number): void {
    this.chorusAmount = Math.max(0, Math.min(1, value));

    if (this.activeLayer) {
      this.activeLayer.chorus.wet.rampTo(this.chorusAmount, 0.12);
      this.activeLayer.chorus.depth = 0.25 + this.chorusAmount * 0.5;
    }
  }

  setModulationAmount(value: number): void {
    this.modulationAmount = Math.max(0, Math.min(1, value));
  }

  setReverseAmount(value: number): void {
    this.reverseAmount = Math.max(0, Math.min(1, value));

    if (this.activeLayer) {
      this.activeLayer.reverb.preDelay = 0.02 + this.reverseAmount * 0.12;
      this.activeLayer.reverb.decay = 5 + this.reverseAmount * 4;
    }
  }

  setBrightness(value: number): void {
    this.brightness = Math.max(0, Math.min(1, value));

    if (this.activeLayer) {
      const preset = this.getPresetValues(this.currentSettings.preset);
      this.activeLayer.filter.frequency.rampTo(
        700 + preset.filter + this.brightness * 1200,
        0.12
      );
    }
  }
}

export const padEngine = new PadEngine();
