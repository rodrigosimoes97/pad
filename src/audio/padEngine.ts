import * as Tone from 'tone';
import { PAD_PRESETS, type PadPresetId } from './presets';

export type EngineOptions = {
  notes: string[];
  preset: PadPresetId;
  volume: number;
};

class PadEngine {
  private synth: Tone.PolySynth | null = null;
  private filter: Tone.Filter | null = null;
  private chorus: Tone.Chorus | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  private currentNotes: string[] = [];
  private playing = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    this.synth = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 8 });
    this.filter = new Tone.Filter({ type: 'lowpass', frequency: 1800, rolloff: -24, Q: 0.8 });
    this.chorus = new Tone.Chorus({ frequency: 0.3, delayTime: 4.5, depth: 0.4, wet: 0.3 }).start();
    this.reverb = new Tone.Reverb({ decay: 6, preDelay: 0.04, wet: 0.22 });
    this.gain = new Tone.Gain(0.55);
    this.limiter = new Tone.Limiter(-2);

    this.synth.chain(this.filter, this.chorus, this.reverb, this.gain, this.limiter, Tone.Destination);
    this.initialized = true;
  }

  private ensureNodes(): asserts this is this & {
    synth: Tone.PolySynth;
    filter: Tone.Filter;
    chorus: Tone.Chorus;
    reverb: Tone.Reverb;
    gain: Tone.Gain;
    limiter: Tone.Limiter;
  } {
    if (!this.synth || !this.filter || !this.chorus || !this.reverb || !this.gain || !this.limiter) {
      throw new Error('Pad engine not initialized');
    }
  }

  private applyPreset(presetId: PadPresetId): void {
    this.ensureNodes();
    const preset = PAD_PRESETS[presetId];

    this.synth.set(preset.synth);
    this.filter.set({ frequency: preset.filter.frequency, rolloff: preset.filter.rolloff, Q: preset.filter.q });
    this.chorus.set(preset.chorus);
    this.reverb.set(preset.reverb);
  }

  setVolume(volume: number): void {
    if (!this.gain) return;
    const safeVolume = Math.min(1, Math.max(0, volume));
    this.gain.gain.rampTo(safeVolume, 0.2);
  }

  async startOrUpdate({ notes, preset, volume }: EngineOptions): Promise<void> {
    await this.init();
    this.ensureNodes();
    this.applyPreset(preset);
    this.setVolume(volume);

    const now = Tone.now();

    if (!this.playing) {
      this.synth.triggerAttack(notes, now, 0.75);
      this.currentNotes = notes;
      this.playing = true;
      return;
    }

    const releaseCandidates = this.currentNotes.filter((note) => !notes.includes(note));
    if (releaseCandidates.length > 0) {
      this.synth.triggerRelease(releaseCandidates, now);
    }

    const attackCandidates = notes.filter((note) => !this.currentNotes.includes(note));
    if (attackCandidates.length > 0) {
      this.synth.triggerAttack(attackCandidates, now + 0.04, 0.75);
    }

    this.currentNotes = notes;
  }

  stop(): void {
    if (!this.synth || !this.playing) return;
    this.synth.triggerRelease(this.currentNotes);
    this.currentNotes = [];
    this.playing = false;
  }

  async panic(): Promise<void> {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
      this.filter?.dispose();
      this.chorus?.dispose();
      this.reverb?.dispose();
      this.gain?.dispose();
      this.limiter?.dispose();
    }

    this.synth = null;
    this.filter = null;
    this.chorus = null;
    this.reverb = null;
    this.gain = null;
    this.limiter = null;
    this.initialized = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export const padEngine = new PadEngine();
