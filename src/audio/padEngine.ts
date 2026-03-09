import * as Tone from 'tone';

export type PadStructure = 'root' | 'root-fifth' | 'root-fifth-octave';
export type PadPresetName = 'base' | 'atmospheric' | 'open';

export type PadSettings = {
  note: string;
  octave: number;
  structure: PadStructure;
  preset: PadPresetName;
};

type WorshipVariant = {
  label: string;
  brightnessTilt: number;
  ambienceTilt: number;
  chorusTilt: number;
};

type Layer = {
  mainSynth: Tone.PolySynth<Tone.Synth>;
  airSynth: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  widener: Tone.StereoWidener;
  reverb: Tone.Reverb;
  ambienceDelay: Tone.FeedbackDelay;
  delayFilter: Tone.Filter;
  outputGain: Tone.Gain;
  dryGain: Tone.Gain;
  wetGain: Tone.Gain;
  filterLfo: Tone.LFO;
  ampLfo: Tone.LFO;
  notes: string[];
  airNotes: string[];
};

const WORSHIP_VARIANTS: Record<PadPresetName, WorshipVariant> = {
  base: { label: 'Base', brightnessTilt: 1, ambienceTilt: 1, chorusTilt: 1 },
  atmospheric: { label: 'Atmosférico', brightnessTilt: 0.96, ambienceTilt: 1.18, chorusTilt: 1.08 },
  open: { label: 'Aberto', brightnessTilt: 1.12, ambienceTilt: 1.06, chorusTilt: 1.02 },
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

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
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
    preset: 'base',
  };

  private volume = 0.72;
  private reverbAmount = 0.5;
  private chorusAmount = 0.35;
  private modulationAmount = 0.3;
  private reverseAmount = 0.2;
  private brightness = 0.5;

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

  getPresetLabel(): string {
    return WORSHIP_VARIANTS[this.currentSettings.preset].label;
  }

  async ensureStartedFromGesture(): Promise<void> {
    if (!this.initialized) {
      this.masterGain = new Tone.Gain(0.92);
      this.limiter = new Tone.Limiter(-1.5);
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
    const notes = buildPadNotes(settings.note, settings.octave, settings.structure);
    const airNotes = buildPadNotes(settings.note, settings.octave + 1, settings.structure);

    const mainSynth = new Tone.PolySynth(Tone.Synth, {
      volume: -10,
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 1.9,
        decay: 1.2,
        sustain: 0.92,
        release: 5.5,
      },
    });

    const airSynth = new Tone.PolySynth(Tone.Synth, {
      volume: -17,
      oscillator: { type: 'sine' },
      detune: 4,
      envelope: {
        attack: 2.8 + this.reverseAmount * 1.2,
        decay: 1.3,
        sustain: 0.76,
        release: 6.6,
      },
    });

    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 1800,
      rolloff: -24,
      Q: 0.55,
    });

    const chorus = new Tone.Chorus({
      frequency: 0.24,
      delayTime: 4.5,
      depth: 0.3,
      spread: 180,
      wet: 0.22,
    }).start();

    const widener = new Tone.StereoWidener(0.2);

    const reverb = new Tone.Reverb({
      decay: 10,
      preDelay: 0.04,
      wet: 0.3,
    });

    const delayFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 2400,
      Q: 0.2,
    });

    const ambienceDelay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.18,
      wet: 0.12,
    });

    const outputGain = new Tone.Gain(0);
    const dryGain = new Tone.Gain(0.84);
    const wetGain = new Tone.Gain(0.34);

    const filterLfo = new Tone.LFO({
      frequency: 0.045,
      min: 1050,
      max: 1850,
    }).start();

    const ampLfo = new Tone.LFO({
      frequency: 0.03,
      min: 0.62,
      max: 0.7,
    }).start();

    mainSynth.connect(filter);
    airSynth.connect(filter);

    filter.connect(chorus);
    chorus.connect(widener);

    widener.connect(dryGain);
    dryGain.connect(outputGain);

    widener.connect(reverb);
    reverb.connect(delayFilter);
    delayFilter.connect(ambienceDelay);
    ambienceDelay.connect(wetGain);
    wetGain.connect(outputGain);

    outputGain.connect(masterGain);

    filterLfo.connect(filter.frequency);
    ampLfo.connect(outputGain.gain);

    this.applyLiveControlsToLayer({
      mainSynth,
      airSynth,
      filter,
      chorus,
      widener,
      reverb,
      ambienceDelay,
      delayFilter,
      outputGain,
      dryGain,
      wetGain,
      filterLfo,
      ampLfo,
      notes,
      airNotes,
    });

    return {
      mainSynth,
      airSynth,
      filter,
      chorus,
      widener,
      reverb,
      ambienceDelay,
      delayFilter,
      outputGain,
      dryGain,
      wetGain,
      filterLfo,
      ampLfo,
      notes,
      airNotes,
    };
  }

  private applyLiveControlsToLayer(layer: Layer): void {
    const variant = WORSHIP_VARIANTS[this.currentSettings.preset];
    const modulation = clamp(this.modulationAmount);
    const brightness = clamp(this.brightness);
    const chorus = clamp(this.chorusAmount * variant.chorusTilt);
    const reverse = clamp(this.reverseAmount * variant.ambienceTilt);
    const reverb = clamp(this.reverbAmount * variant.ambienceTilt);

    const filterBase = 1050 + brightness * 2200 * variant.brightnessTilt;
    const filterDepth = 70 + modulation * 260;

    layer.filter.frequency.rampTo(filterBase, 0.2);
    layer.filterLfo.min = Math.max(300, filterBase - filterDepth);
    layer.filterLfo.max = filterBase + filterDepth;
    layer.filterLfo.frequency.rampTo(0.03 + modulation * 0.09, 0.25);

    layer.chorus.wet.rampTo(0.08 + chorus * 0.38, 0.2);
    layer.chorus.depth = 0.18 + chorus * 0.46;
    layer.chorus.frequency.rampTo(0.16 + modulation * 0.4, 0.2);

    layer.widener.width.rampTo(0.24 + chorus * 0.5 + reverse * 0.2, 0.2);

    layer.reverb.decay = 7 + reverb * 8 + reverse * 4;
    layer.reverb.preDelay = 0.02 + reverse * 0.11;
    layer.reverb.wet.rampTo(0.18 + reverb * 0.54, 0.2);

    layer.ambienceDelay.feedback.rampTo(0.08 + reverse * 0.2, 0.2);
    layer.ambienceDelay.wet.rampTo(0.04 + reverse * 0.24, 0.2);
    layer.delayFilter.frequency.rampTo(1850 + brightness * 1200, 0.2);

    const baseGain = this.volume * 0.86;
    layer.outputGain.gain.rampTo(baseGain, 0.2);
    layer.ampLfo.min = Math.max(0, baseGain * (0.9 - modulation * 0.07));
    layer.ampLfo.max = baseGain * (1 + modulation * 0.03);
  }

  private disposeLayer(layer: Layer, delayMs = 1700): void {
    window.setTimeout(() => {
      layer.mainSynth.dispose();
      layer.airSynth.dispose();
      layer.filter.dispose();
      layer.chorus.dispose();
      layer.widener.dispose();
      layer.reverb.dispose();
      layer.ambienceDelay.dispose();
      layer.delayFilter.dispose();
      layer.outputGain.dispose();
      layer.dryGain.dispose();
      layer.wetGain.dispose();
      layer.filterLfo.dispose();
      layer.ampLfo.dispose();
    }, delayMs);
  }

  private async startPad(settings: PadSettings): Promise<void> {
    await this.ensureStartedFromGesture();

    const layer = this.createLayer(settings);
    const now = Tone.now();

    layer.mainSynth.triggerAttack(layer.notes, now);
    layer.airSynth.triggerAttack(layer.airNotes, now + 0.06);

    const targetGain = this.volume * 0.86;
    layer.outputGain.gain.setValueAtTime(0, now);
    layer.outputGain.gain.linearRampToValueAtTime(targetGain, now + 0.46);

    if (this.activeLayer) {
      this.activeLayer.outputGain.gain.cancelScheduledValues(now);
      this.activeLayer.outputGain.gain.linearRampToValueAtTime(0, now + 0.42);
      this.activeLayer.mainSynth.triggerRelease(this.activeLayer.notes, now + 0.08);
      this.activeLayer.airSynth.triggerRelease(this.activeLayer.airNotes, now + 0.08);
      this.disposeLayer(this.activeLayer);
    }

    this.activeLayer = layer;
    this.currentSettings = settings;
    this.playingState = true;
  }

  async startOrUpdate(
    note: string,
    octave: number,
    structure: PadStructure,
    preset: PadPresetName
  ): Promise<void> {
    await this.updateSettings({
      note,
      octave,
      structure,
      preset,
    });
  
    await this.ensureStartedFromGesture();
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
    this.activeLayer.outputGain.gain.cancelScheduledValues(now);
    this.activeLayer.outputGain.gain.linearRampToValueAtTime(0, now + 0.45);
    this.activeLayer.mainSynth.triggerRelease(this.activeLayer.notes, now + 0.04);
    this.activeLayer.airSynth.triggerRelease(this.activeLayer.airNotes, now + 0.04);
    this.disposeLayer(this.activeLayer);

    this.activeLayer = null;
    this.playingState = false;
  }

  setVolume(value: number): void {
    this.volume = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }

  setReverbAmount(value: number): void {
    this.reverbAmount = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }

  setChorusAmount(value: number): void {
    this.chorusAmount = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }

  setModulationAmount(value: number): void {
    this.modulationAmount = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }

  setReverseAmount(value: number): void {
    this.reverseAmount = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }

  setBrightness(value: number): void {
    this.brightness = clamp(value);
    if (!this.activeLayer) return;
    this.applyLiveControlsToLayer(this.activeLayer);
  }
}

export const padEngine = new PadEngine();
