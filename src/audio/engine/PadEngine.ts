import * as Tone from 'tone';
import { ReverseAtmosphere } from '../effects/ReverseAtmosphere';
import { WORSHIP_PRESETS } from '../presets/worshipPresets';
import type { LayerMix, MotionLevel, PadSettings, ReverbType } from '../../types/pad';
import { buildPadVoices } from './harmony';

type LayerNodes = {
  synth: Tone.PolySynth<Tone.Synth>;
  gain: Tone.Gain;
  panner: Tone.AutoPanner;
};

type VoiceStack = {
  layers: Record<keyof LayerMix, LayerNodes>;
  preFilter: Tone.Filter;
  shimmerEq: Tone.EQ3;
  chorus: Tone.Chorus;
  stereo: Tone.StereoWidener;
  saturation: Tone.Distortion;
  reverbSend: Tone.Gain;
  dryGain: Tone.Gain;
  outGain: Tone.Gain;
  notes: string[];
};

export type AudioRuntimeStatus = 'locked' | 'unlocking' | 'ready' | 'error';

const DEBUG_AUDIO = true;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const MOTION_MAP: Record<MotionLevel, { filterDepth: number; ampDepth: number; rate: number; panAmount: number }> = {
  off: { filterDepth: 0, ampDepth: 0, rate: 0.01, panAmount: 0 },
  slow: { filterDepth: 120, ampDepth: 0.02, rate: 0.028, panAmount: 0.1 },
  medium: { filterDepth: 220, ampDepth: 0.038, rate: 0.05, panAmount: 0.2 },
  deep: { filterDepth: 350, ampDepth: 0.055, rate: 0.08, panAmount: 0.28 },
};

const REVERB_CONFIG: Record<ReverbType, { decay: number; preDelay: number; damp: number }> = {
  hall: { decay: 4.2, preDelay: 0.02, damp: 2600 },
  church: { decay: 5.3, preDelay: 0.03, damp: 2200 },
  cathedral: { decay: 7.1, preDelay: 0.05, damp: 1800 },
  ambient: { decay: 8.6, preDelay: 0.08, damp: 3200 },
};

export class PadEngine {
  private initialized = false;
  private playing = false;
  private unlockInProgress = false;
  private unlockError: string | null = null;
  private activeStack: VoiceStack | null = null;
  private current: PadSettings;

  private master: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  private masterFilter: Tone.Filter | null = null;
  private masterLfo: Tone.LFO | null = null;
  private ampLfo: Tone.LFO | null = null;
  private algoReverb: Tone.Reverb | null = null;
  private convolver: Tone.Convolver | null = null;
  private reverseAtmosphere: ReverseAtmosphere | null = null;
  private useConvolver = false;
  private masterConnected = false;

  constructor(initial: PadSettings) {
    this.current = initial;
  }

  private log(...args: unknown[]) {
    if (DEBUG_AUDIO) console.info('[PadEngine]', ...args);
  }

  get settings() {
    return this.current;
  }

  get isPlaying() {
    return this.playing;
  }

  getAudioContextState(): AudioContextState {
    return Tone.getContext().rawContext.state;
  }

  getAudioStatus(): AudioRuntimeStatus {
    if (this.unlockError) return 'error';
    if (this.unlockInProgress) return 'unlocking';
    return this.getAudioContextState() === 'running' ? 'ready' : 'locked';
  }

  getAudioError() {
    return this.unlockError;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    this.master = new Tone.Gain(0.7);
    this.masterFilter = new Tone.Filter({ type: 'lowpass', frequency: 2100, rolloff: -12, Q: 0.4 });
    this.limiter = new Tone.Limiter(-1.5);
    this.masterFilter.connect(this.limiter);
    this.limiter.connect(this.master);
    this.master.toDestination();
    this.masterConnected = true;
    this.log('master connected=', this.masterConnected);

    this.algoReverb = new Tone.Reverb(REVERB_CONFIG[this.current.reverbType]);
    this.algoReverb.wet.value = 1;

    this.masterLfo = new Tone.LFO({ frequency: 0.03, min: 1600, max: 2200 }).connect(this.masterFilter.frequency).start();
    this.ampLfo = new Tone.LFO({ frequency: 0.02, min: 0.98, max: 1.02 }).connect(this.master.gain).start();

    await this.tryLoadConvolutionIR();

    this.reverseAtmosphere = new ReverseAtmosphere();
    await this.reverseAtmosphere.init();
    this.reverseAtmosphere.connect(this.masterFilter);
    this.applyReverseSettings(this.current);

    this.initialized = true;
    this.log('initialized audio graph, context=', this.getAudioContextState());
  }

  async ensureAudioUnlocked(): Promise<boolean> {
    await this.ensureInitialized();
    if (this.getAudioContextState() === 'running') return true;
    if (this.unlockInProgress) return false;

    this.unlockInProgress = true;
    this.unlockError = null;
    this.log('unlock requested');
    this.log('audio context before resume=', this.getAudioContextState());

    try {
      await Tone.start();
      if (Tone.getContext().rawContext.state !== 'running') {
        await Tone.getContext().rawContext.resume();
      }

      this.log('audio context after resume=', this.getAudioContextState());
      if (this.getAudioContextState() !== 'running') {
        throw new Error(`AudioContext state is ${this.getAudioContextState()}`);
      }

      if (this.master) {
        this.master.disconnect();
        this.master.toDestination();
        this.masterConnected = true;
      }
      this.log('master connected=', this.masterConnected);

      this.unlockError = null;
      this.log('unlock completed; context=', this.getAudioContextState());
      return true;
    } catch (error) {
      this.unlockError = error instanceof Error ? error.message : 'Falha ao habilitar áudio';
      this.log('unlock failed:', this.unlockError);
      return false;
    } finally {
      this.unlockInProgress = false;
    }
  }

  async refreshAudioStateAfterVisibility(): Promise<boolean> {
    if (!this.initialized) return false;
    this.log('visibility refresh; context=', this.getAudioContextState());
    if (this.getAudioContextState() === 'running') return true;
    try {
      await Tone.getContext().rawContext.resume();
    } catch {
      // resume can fail on mobile without user gesture
    }
    this.log('visibility refresh done; context=', this.getAudioContextState());
    return this.getAudioContextState() === 'running';
  }

  private async tryLoadConvolutionIR() {
    try {
      const irUrl = `${import.meta.env.BASE_URL}irs/church-impulse.wav`;
      const response = await fetch(irUrl);
      if (!response.ok) return;
      this.convolver = new Tone.Convolver(irUrl);
      this.useConvolver = true;
    } catch {
      this.useConvolver = false;
    }
  }

  private requireOutput(): Tone.Filter {
    if (!this.masterFilter || !this.master || !this.limiter || !this.algoReverb) {
      throw new Error('Engine not ready');
    }
    return this.masterFilter;
  }

  private createLayer(voice: keyof LayerMix, envelope: { attack: number; release: number }): LayerNodes {
    const config: Record<keyof LayerMix, { osc: 'sine' | 'triangle' | 'sawtooth'; detune: number; volume: number; spreadRate: number }> = {
      warm: { osc: 'triangle', detune: 2, volume: -14, spreadRate: 0.021 },
      shimmer: { osc: 'sine', detune: 9, volume: -18, spreadRate: 0.018 },
      choir: { osc: 'sine', detune: 4, volume: -16, spreadRate: 0.016 },
      low: { osc: 'triangle', detune: -4, volume: -15, spreadRate: 0.013 },
    };

    const layer = config[voice];
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: layer.osc },
      volume: layer.volume,
      envelope: {
        attack: envelope.attack,
        decay: 0.6,
        sustain: 0.92,
        release: envelope.release,
      },
    });

    const panner = new Tone.AutoPanner({ frequency: layer.spreadRate, depth: 0.2 }).start();
    const gain = new Tone.Gain(0);
    synth.chain(panner, gain);

    return { synth, gain, panner };
  }

  private buildStack(settings: PadSettings): VoiceStack {
    const output = this.requireOutput();
    const preset = WORSHIP_PRESETS[settings.preset];
    const notes = buildPadVoices(settings.key, settings.octave, settings.mode, settings.structure);

    const layers: Record<keyof LayerMix, LayerNodes> = {
      warm: this.createLayer('warm', preset.envelope),
      shimmer: this.createLayer('shimmer', { attack: preset.envelope.attack + 0.6, release: preset.envelope.release + 1.1 }),
      choir: this.createLayer('choir', { attack: preset.envelope.attack + 0.8, release: preset.envelope.release + 1.3 }),
      low: this.createLayer('low', { attack: Math.max(0.5, preset.envelope.attack - 0.3), release: preset.envelope.release + 0.5 }),
    };

    const preFilter = new Tone.Filter({ type: 'lowpass', frequency: 1400 * settings.brightness, Q: 0.5 });
    const shimmerEq = new Tone.EQ3({ high: 2, mid: 0, low: -1 });
    const chorus = new Tone.Chorus({ frequency: 0.9, depth: 0.35, spread: 180, wet: 0.24 }).start();
    const stereo = new Tone.StereoWidener(clamp(preset.stereoWidth, 0.2, 0.9));
    const saturation = new Tone.Distortion({ distortion: 0.03, wet: 0.13 });

    const dryGain = new Tone.Gain(1 - settings.reverbMix * 0.35);
    const reverbSend = new Tone.Gain(settings.reverbMix);
    const outGain = new Tone.Gain(0);

    Object.values(layers).forEach((layer) => layer.gain.connect(preFilter));
    preFilter.chain(shimmerEq, chorus, stereo, saturation);
    saturation.connect(dryGain);
    saturation.connect(reverbSend);
    this.reverseAtmosphere?.connectInput(preFilter);

    if (this.useConvolver && this.convolver) {
      reverbSend.connect(this.convolver);
      this.convolver.connect(outGain);
    } else {
      reverbSend.connect(this.algoReverb!);
      this.algoReverb!.connect(outGain);
    }

    dryGain.connect(outGain);
    outGain.connect(output);

    return { layers, preFilter, shimmerEq, chorus, stereo, saturation, reverbSend, dryGain, outGain, notes };
  }

  private updateMotion(settings: PadSettings) {
    if (!this.masterFilter || !this.master || !this.masterLfo || !this.ampLfo) return;
    const motion = MOTION_MAP[settings.motion];
    const baseFilter = 1500 * settings.brightness;

    this.masterLfo.frequency.rampTo(motion.rate, 0.25);
    this.masterLfo.min = Math.max(850, baseFilter - motion.filterDepth);
    this.masterLfo.max = baseFilter + motion.filterDepth;

    const baseAmp = clamp(settings.masterVolume, 0.2, 0.88);
    this.ampLfo.frequency.rampTo(motion.rate * 0.7, 0.25);
    this.ampLfo.min = baseAmp * (1 - motion.ampDepth);
    this.ampLfo.max = baseAmp * (1 + motion.ampDepth);

    if (this.activeStack) {
      Object.values(this.activeStack.layers).forEach((layer) => {
        layer.panner.depth.rampTo(motion.panAmount, 0.4);
      });
    }
  }

  private setReverbType(type: ReverbType) {
    if (!this.algoReverb) return;
    this.algoReverb.set(REVERB_CONFIG[type]);
  }

  private applyReverseSettings(settings: PadSettings) {
    if (!this.reverseAtmosphere) return;
    this.reverseAtmosphere.setAmount(settings.reverseAtmosphere);
    this.reverseAtmosphere.setMix(settings.reverseMix);
    this.reverseAtmosphere.setTone(settings.reverseTone);
    this.reverseAtmosphere.setPreDelay(settings.reversePreDelay);
    this.reverseAtmosphere.setWidth(settings.reverseWidth);
    this.reverseAtmosphere.setDucking(settings.reverseDucking);
    this.reverseAtmosphere.setDebugSolo(settings.reverseDebugSolo);
    this.reverseAtmosphere.applyDuckingContext(settings.masterVolume, false);
  }

  triggerReverseTest() {
    this.log('reverse test fired');
    this.reverseAtmosphere?.triggerDebugPulse();
    this.reverseAtmosphere?.triggerTransitionSwell(1.28);
  }

  async playOrToggle(nextKey: PadSettings['key']): Promise<boolean> {
    if (this.playing && this.current.key === nextKey && !this.current.hold) {
      this.smoothStop();
      return false;
    }
    if (this.playing && this.current.key !== nextKey) this.reverseAtmosphere?.triggerTransitionSwell(0.9);
    await this.start({ ...this.current, key: nextKey });
    return true;
  }

  async start(settings = this.current): Promise<void> {
    await this.ensureInitialized();
    this.current = settings;
    this.setReverbType(settings.reverbType);
    this.applyReverseSettings(settings);

    const stack = this.buildStack(settings);
    const now = Tone.now();

    this.log('start triggered; context=', this.getAudioContextState());
    if (this.getAudioContextState() !== 'running') {
      throw new Error(`AudioContext not running: ${this.getAudioContextState()}`);
    }
    if (!this.masterConnected && this.master) {
      this.master.toDestination();
      this.masterConnected = true;
      this.log('master connected=', this.masterConnected);
    }

    for (const [name, layer] of Object.entries(stack.layers) as [keyof LayerMix, LayerNodes][]) {
      const layerGain = clamp(settings.layers[name], 0, 1) * 0.55;
      layer.synth.triggerAttack(stack.notes, now + (name === 'shimmer' || name === 'choir' ? 0.05 : 0));
      layer.gain.gain.cancelAndHoldAtTime(now);
      layer.gain.gain.linearRampTo(layerGain, settings.fadeIn);
    }

    stack.outGain.gain.setValueAtTime(0, now);
    stack.outGain.gain.linearRampToValueAtTime(clamp(settings.masterVolume, 0, 0.9), now + settings.fadeIn);

    this.reverseAtmosphere?.triggerTransitionSwell(this.playing ? 0.96 : 0.68);

    if (this.activeStack) {
      this.releaseStack(this.activeStack, settings.fadeOut);
    }

    this.activeStack = stack;
    this.playing = true;
    this.updateMotion(settings);
    this.reverseAtmosphere?.applyDuckingContext(settings.masterVolume, true);
    window.setTimeout(() => this.reverseAtmosphere?.applyDuckingContext(settings.masterVolume, false), 540);
  }

  async updateSettings(patch: Partial<PadSettings>) {
    this.current = { ...this.current, ...patch, layers: { ...this.current.layers, ...patch.layers } };

    if (patch.reverbType) this.setReverbType(this.current.reverbType);
    this.applyReverseSettings(this.current);
    this.updateMotion(this.current);

    if (this.activeStack) {
      const now = Tone.now();
      this.activeStack.outGain.gain.rampTo(clamp(this.current.masterVolume, 0, 0.9), 0.2);
      this.activeStack.preFilter.frequency.rampTo(1400 * this.current.brightness, 0.25);
      this.activeStack.reverbSend.gain.rampTo(this.current.reverbMix, 0.2);
      this.activeStack.dryGain.gain.rampTo(1 - this.current.reverbMix * 0.35, 0.2);

      for (const [name, layer] of Object.entries(this.activeStack.layers) as [keyof LayerMix, LayerNodes][]) {
        layer.gain.gain.cancelScheduledValues(now);
        layer.gain.gain.rampTo(clamp(this.current.layers[name], 0, 1) * 0.55, 0.2);
      }

      if (patch.key || patch.mode || patch.structure || patch.octave || patch.preset) {
        this.reverseAtmosphere?.triggerTransitionSwell(0.95);
        await this.start(this.current);
      }
    }
  }

  smoothStop() {
    if (!this.activeStack) return;
    this.reverseAtmosphere?.triggerTransitionSwell(0.88);
    this.reverseAtmosphere?.applyDuckingContext(this.current.masterVolume, true);
    this.releaseStack(this.activeStack, this.current.fadeOut);
    this.activeStack = null;
    this.playing = false;
    window.setTimeout(() => this.reverseAtmosphere?.applyDuckingContext(this.current.masterVolume, false), 440);
  }

  panic() {
    this.activeStack?.outGain.gain.cancelScheduledValues(Tone.now());
    this.activeStack?.outGain.gain.setValueAtTime(0, Tone.now());
    if (this.activeStack) this.disposeStack(this.activeStack);
    this.activeStack = null;
    this.playing = false;
  }

  private releaseStack(stack: VoiceStack, fadeOut: number) {
    const now = Tone.now();
    stack.outGain.gain.cancelScheduledValues(now);
    stack.outGain.gain.linearRampToValueAtTime(0, now + fadeOut);
    Object.values(stack.layers).forEach((layer) => {
      layer.synth.triggerRelease(stack.notes, now + 0.02);
    });
    window.setTimeout(() => this.disposeStack(stack), (fadeOut + 0.8) * 1000);
  }

  private disposeStack(stack: VoiceStack) {
    this.reverseAtmosphere?.disconnectInput(stack.preFilter);
    Object.values(stack.layers).forEach((layer) => {
      layer.synth.dispose();
      layer.gain.dispose();
      layer.panner.dispose();
    });
    stack.preFilter.dispose();
    stack.shimmerEq.dispose();
    stack.chorus.dispose();
    stack.stereo.dispose();
    stack.saturation.dispose();
    stack.reverbSend.dispose();
    stack.dryGain.dispose();
    stack.outGain.dispose();
  }

  dispose() {
    this.activeStack && this.disposeStack(this.activeStack);
    this.reverseAtmosphere?.dispose();
    this.masterConnected = false;
  }
}
