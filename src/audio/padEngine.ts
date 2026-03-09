import * as Tone from 'tone';
import type { PadSettings } from './audioTypes';
import { PAD_PRESETS, type PadPreset, type PadPresetId } from './presets';
import { getPadNotes } from '../utils/notes';

type Layer = {
  id: number;
  notes: string[];
  presetId: PadPresetId;
  synth: Tone.PolySynth;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  gain: Tone.Gain;
  releaseTime: number;
};

const TRANSITION_SECONDS = 0.38;

class PadEngine {
  private initialized = false;
  private layerId = 0;
  private activeLayer: Layer | null = null;
  private transitionLayer: Layer | null = null;
  private masterGain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  private isActive = false;
  private currentVolume = 0.62;
  private currentReverb = 0.45;
  private currentBrightness = 0.5;
  private cleanupTimer: number | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    this.masterGain = new Tone.Gain(this.currentVolume);
    this.limiter = new Tone.Limiter(-2.5);
    this.masterGain.chain(this.limiter, Tone.Destination);

    this.initialized = true;
  }

  private assertMaster(): asserts this is this & { masterGain: Tone.Gain; limiter: Tone.Limiter } {
    if (!this.masterGain || !this.limiter) throw new Error('Audio engine not initialized');
  }

  private createLayer(presetId: PadPresetId): Layer {
    this.assertMaster();

    const preset = PAD_PRESETS[presetId];
    const synth = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 8 });
    const filter = new Tone.Filter({ type: 'lowpass', frequency: preset.filterFrequency, rolloff: -24, Q: 0.7 });
    const chorus = new Tone.Chorus(preset.chorus).start();
    const reverb = new Tone.Reverb(preset.reverb);
    const gain = new Tone.Gain(0);

    synth.set(preset.synth);
    synth.chain(filter, chorus, reverb, gain, this.masterGain);

    const layer: Layer = {
      id: ++this.layerId,
      notes: [],
      presetId,
      synth,
      filter,
      chorus,
      reverb,
      gain,
      releaseTime: preset.synth.envelope.release
    };

    this.applyLayerTone(layer, preset);
    this.applyLayerReverb(layer, preset);
    return layer;
  }

  private applyLayerReverb(layer: Layer, preset: PadPreset): void {
    const targetWet = Math.min(0.95, Math.max(0, preset.reverb.wet * (0.35 + this.currentReverb * 1.45)));
    layer.reverb.wet.rampTo(targetWet, 0.25);
  }

  private applyLayerTone(layer: Layer, preset: PadPreset): void {
    const [min, max] = preset.brightnessRange;
    const target = min + (max - min) * this.currentBrightness;
    layer.filter.frequency.rampTo(target, 0.25);
  }

  private disposeLayer(layer: Layer): void {
    layer.synth.dispose();
    layer.filter.dispose();
    layer.chorus.dispose();
    layer.reverb.dispose();
    layer.gain.dispose();
  }

  private scheduleCleanup(layer: Layer, delaySeconds: number): void {
    if (this.cleanupTimer) window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = window.setTimeout(() => {
      this.disposeLayer(layer);
      if (this.transitionLayer?.id === layer.id) this.transitionLayer = null;
      this.cleanupTimer = null;
    }, delaySeconds * 1000);
  }

  private toNotes(settings: PadSettings): string[] {
    return getPadNotes(settings.note, settings.octave, settings.structure);
  }

  async startPad(settings: PadSettings): Promise<void> {
    await this.init();
    const layer = this.createLayer(settings.preset);
    const notes = this.toNotes(settings);
    const now = Tone.now();

    layer.notes = notes;
    layer.gain.gain.setValueAtTime(0, now);
    layer.synth.triggerAttack(notes, now, 0.72);
    layer.gain.gain.rampTo(1, TRANSITION_SECONDS);

    if (this.activeLayer) {
      this.activeLayer.gain.gain.cancelAndHoldAtTime(now);
      this.activeLayer.gain.gain.rampTo(0, TRANSITION_SECONDS);
      this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + TRANSITION_SECONDS * 0.4);
      this.transitionLayer = this.activeLayer;
      this.scheduleCleanup(this.activeLayer, TRANSITION_SECONDS + this.activeLayer.releaseTime + 0.2);
    }

    this.activeLayer = layer;
    this.isActive = true;
  }

  async updatePad(settings: PadSettings): Promise<void> {
    if (!this.isActive) return;
    await this.startPad(settings);
  }

  stopPad(): void {
    if (!this.activeLayer || !this.isActive) return;
    const now = Tone.now();

    this.activeLayer.gain.gain.cancelAndHoldAtTime(now);
    this.activeLayer.gain.gain.rampTo(0, 0.45);
    if (!this.currentHold) {
      this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + 0.1);
    }
    this.scheduleCleanup(this.activeLayer, this.activeLayer.releaseTime + 0.6);
    this.activeLayer = null;
    this.isActive = false;
  }

  private currentHold = false;

  setHold(hold: boolean): void {
    this.currentHold = hold;
  }

  fadeOut(duration = 1.2): void {
    if (!this.activeLayer) return;
    const now = Tone.now();
    this.activeLayer.gain.gain.cancelAndHoldAtTime(now);
    this.activeLayer.gain.gain.rampTo(0, duration);
    this.activeLayer.synth.triggerRelease(this.activeLayer.notes, now + Math.max(0.05, duration * 0.2));
    this.scheduleCleanup(this.activeLayer, duration + this.activeLayer.releaseTime + 0.1);
    this.activeLayer = null;
    this.isActive = false;
  }

  setVolume(value: number): void {
    this.currentVolume = Math.min(1, Math.max(0, value));
    if (this.masterGain) this.masterGain.gain.rampTo(this.currentVolume, 0.15);
  }

  setReverbAmount(value: number): void {
    this.currentReverb = Math.min(1, Math.max(0, value));
    const apply = (layer: Layer | null) => {
      if (!layer) return;
      this.applyLayerReverb(layer, PAD_PRESETS[layer.presetId]);
    };
    apply(this.activeLayer);
    apply(this.transitionLayer);
  }

  setBrightness(value: number): void {
    this.currentBrightness = Math.min(1, Math.max(0, value));
    const apply = (layer: Layer | null) => {
      if (!layer) return;
      this.applyLayerTone(layer, PAD_PRESETS[layer.presetId]);
    };
    apply(this.activeLayer);
    apply(this.transitionLayer);
  }

  async panic(): Promise<void> {
    if (this.cleanupTimer) window.clearTimeout(this.cleanupTimer);

    const clear = (layer: Layer | null) => {
      if (!layer) return;
      layer.synth.releaseAll();
      this.disposeLayer(layer);
    };

    clear(this.activeLayer);
    clear(this.transitionLayer);
    this.activeLayer = null;
    this.transitionLayer = null;
    this.isActive = false;

    this.masterGain?.dispose();
    this.limiter?.dispose();
    this.masterGain = null;
    this.limiter = null;
    this.initialized = false;
  }

  isPlaying(): boolean {
    return this.isActive;
  }
}

export const padEngine = new PadEngine();
