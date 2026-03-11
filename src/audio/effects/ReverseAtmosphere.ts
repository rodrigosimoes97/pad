import * as Tone from 'tone';
import type { ReverseAtmosphereLevel, ReversePreDelay } from '../../types/pad';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const LEVEL_GAIN: Record<ReverseAtmosphereLevel, number> = {
  off: 0,
  light: 0.72,
  medium: 1.1,
  deep: 1.5,
};

const PRE_DELAY_TIMES: Record<ReversePreDelay, number> = {
  short: 0.05,
  medium: 0.11,
  long: 0.18,
};

type ActiveSource = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

export class ReverseAtmosphere {
  private input = new Tone.Gain(0.9);
  private hp = new Tone.Filter({ type: 'highpass', frequency: 150, Q: 0.22, rolloff: -12 });
  private lp = new Tone.Filter({ type: 'lowpass', frequency: 3600, Q: 0.25, rolloff: -12 });
  private width = new Tone.StereoWidener(0.68);
  private preDelay = new Tone.FeedbackDelay({ delayTime: PRE_DELAY_TIMES.medium, feedback: 0.18, wet: 1 });
  private reverseReverb = new Tone.Reverb({ decay: 5.2, preDelay: 0.04, wet: 1 });
  private textureGain = new Tone.Gain(0.36);
  private swellGain = new Tone.Gain(0);
  private output = new Tone.Gain(0);
  private debugSolo = false;

  private level: ReverseAtmosphereLevel = 'off';
  private mix = 0.18;
  private tone = 0.52;
  private width = 0.68;
  private duckingEnabled = true;
  private debugSolo = false;
  private initialized = false;
  private disposed = false;

  private captureRafId: number | null = null;
  private activeSources = new Set<ActiveSource>();

  constructor() {
    this.input.chain(this.hp, this.lp, this.width, this.preDelay, this.reverseReverb);
    this.reverseReverb.connect(this.textureGain);
    this.textureGain.connect(this.output);
    this.reverseReverb.connect(this.swellGain);
    this.swellGain.connect(this.output);
  }

    this.applyTone(this.tone);
    this.applyWidth(this.width);
    this.applyOutputGain(false, 0.01);
  }

  connect(destination: Tone.ToneAudioNode | AudioNode | AudioParam) {
    this.output.connect(destination);
    console.info('[ReverseAtmosphere] reverse connected to master');
  }

  connectInput(source: Tone.ToneAudioNode) {
    source.connect(this.input);
    console.info('[ReverseAtmosphere] reverse input active');
  }

  disconnectInput(source: Tone.ToneAudioNode) {
    source.disconnect(this.input);
  }

  private connectOutputTarget(target: AudioNode | AudioParam): void {
    if ('setValueAtTime' in target) {
      this.output.connect(target as AudioParam);
    } else {
      this.output.connect(target as AudioNode);
    }
  }

  connect(destination: Tone.ToneAudioNode | AudioNode | AudioParam): void {
    const maybeTone = destination as Tone.ToneAudioNode & {
      input?: AudioNode | AudioParam;
    };

    const target = maybeTone.input;

    if (target) {
      this.connectOutputTarget(target);
    } else {
      this.connectOutputTarget(destination as AudioNode | AudioParam);
    }

    console.info('[ReverseAtmosphere] real reverse connected');
  }

  connectInput(source: Tone.ToneAudioNode): void {
    Tone.connect(source, this.input);
    console.info('[ReverseAtmosphere] capture input connected');
  }

  disconnectInput(source: Tone.ToneAudioNode): void {
    try {
      Tone.disconnect(source, this.input);
    } catch {
      // ignore
    }
  }

  setAmount(level: ReverseAtmosphereLevel): void {
    this.level = level;
    this.applyOutputGain(false);
  }

  setMix(mix: number) {
    this.mix = clamp(mix, 0, 0.7);
    this.applyOutputGain(false);
  }

  setTone(tone: number): void {
    this.tone = clamp(tone, 0, 1);
    this.applyTone(this.tone);
  }

  setPreDelay(mode: ReversePreDelay): void {
    this.preDelay.delayTime.setTargetAtTime(
      PRE_DELAY_TIMES[mode],
      this.liveCtx.currentTime,
      0.02,
    );
  }

  setWidth(value: number): void {
    this.width = clamp(value, 0, 1);
    this.applyWidth(this.width);
  }

  setDucking(enabled: boolean): void {
    this.duckingEnabled = enabled;
    this.applyOutputGain(false);
  }

  applyDuckingContext(mainLevel: number, transitioning: boolean): void {
    this.applyOutputGain(transitioning, 0.09, clamp(mainLevel, 0, 1));
  }

  setDebugSolo(enabled: boolean): void {
    this.debugSolo = enabled;
    this.applyOutputGain(false, 0.08);
  }

  triggerTransitionSwell(strength = 1): void {
    if (!this.initialized || this.disposed) return;

    const effectiveLevel: ReverseAtmosphereLevel =
      this.debugSolo && this.level === 'off' ? 'deep' : this.level;

    if (effectiveLevel === 'off') return;

    const duration = WINDOW_SECONDS[effectiveLevel];
    const target = this.createReverseBufferFromRing(duration, strength);

    if (!target) {
      console.info('[ReverseAtmosphere] not enough captured audio yet');
      return;
    }

    this.playBuffer(target, effectiveLevel, strength);
  }

  triggerDebugPulse(): void {
    if (this.disposed) return;

    const duration = 0.5;
    const length = Math.max(1, Math.floor(this.liveCtx.sampleRate * duration));
    const buffer = this.liveCtx.createBuffer(2, length, this.liveCtx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i += 1) {
      const t = i / this.liveCtx.sampleRate;
      const decay = Math.exp(-t * 8.5);

      const a =
        Math.sin(2 * Math.PI * 220 * t) * 0.55 +
        Math.sin(2 * Math.PI * 440 * t) * 0.28 +
        Math.sin(2 * Math.PI * 880 * t) * 0.16;

      const b =
        Math.sin(2 * Math.PI * 226 * t) * 0.52 +
        Math.sin(2 * Math.PI * 452 * t) * 0.24 +
        Math.sin(2 * Math.PI * 904 * t) * 0.14;

      left[i] = a * decay;
      right[i] = b * decay;
    }

    const reversed = this.reverseBufferWithEnvelope(buffer, 1.15);
    this.playBuffer(reversed, this.debugSolo ? 'deep' : 'medium', 1.15);
  }

  private playBuffer(
    buffer: AudioBuffer,
    effectiveLevel: Exclude<ReverseAtmosphereLevel, 'off'>,
    strength: number,
  ): void {
    const now = this.liveCtx.currentTime;
    const source = this.liveCtx.createBufferSource();
    source.buffer = buffer;

    const gain = this.liveCtx.createGain();
    const base = LEVEL_GAIN[effectiveLevel] * clamp(this.mix * 1.35, 0.12, 1);
    const debugBoost = this.debugSolo ? 1.35 : 1;
    const finalGain = clamp(base * strength * debugBoost, 0.02, 1);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(finalGain, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(finalGain * 0.34, 0.0001),
      now + buffer.duration * 0.72,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + buffer.duration + 0.12);

    source.connect(gain);
    gain.connect(this.hp);

    const active: ActiveSource = { source, gain };
    this.activeSources.add(active);

    source.onended = () => {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      try {
        gain.disconnect();
      } catch {
        // ignore
      }
      this.activeSources.delete(active);
    };

    source.start(now);
    source.stop(now + buffer.duration + 0.15);
  }

  private createReverseBufferFromRing(
    durationSeconds: number,
    strength: number,
  ): AudioBuffer | null {
    if (this.capturedSamples < Math.floor(this.liveCtx.sampleRate * 0.12)) return null;

    const wanted = Math.min(
      Math.floor(durationSeconds * this.liveCtx.sampleRate),
      this.capturedSamples,
      this.ringLength,
    );

    if (wanted < 256) return null;

    const temp = this.liveCtx.createBuffer(2, wanted, this.liveCtx.sampleRate);
    const left = temp.getChannelData(0);
    const right = temp.getChannelData(1);

    let readIndex = (this.writeIndex - wanted + this.ringLength) % this.ringLength;

    for (let i = 0; i < wanted; i += 1) {
      left[i] = this.ringL[readIndex];
      right[i] = this.ringR[readIndex];
      readIndex = (readIndex + 1) % this.ringLength;
    }

    return this.reverseBufferWithEnvelope(temp, strength);
  }

  triggerTransitionSwell(strength = 1) {
    if (this.level === 'off') return;
    const now = Tone.now();
    const predelaySeconds = Tone.Time(this.preDelay.delayTime.value).toSeconds();
    const target = clamp((0.18 + this.mix * 0.86) * LEVEL_GAIN[this.level] * strength, 0.05, 0.82);

    console.info('[ReverseAtmosphere] reverse trigger fired', { strength, target, level: this.level });

    return out;
  }

  setDebugSolo(enabled: boolean) {
    this.debugSolo = enabled;
    this.applyOutputGain(false, 0.12);
  }

  triggerDebugPulse() {
    const now = Tone.now();
    const osc = new Tone.Oscillator({ type: 'triangle', frequency: 540, volume: -8 });
    const gain = new Tone.Gain(0);
    osc.connect(gain);
    gain.connect(this.input);
    osc.start(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.85, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.stop(now + 0.45);
    osc.onstop = () => {
      osc.dispose();
      gain.dispose();
    };
  }

  private applyTone(tone: number) {
    const hp = 120 + tone * 190;
    const lp = 2200 + tone * 3600;
    this.hp.frequency.rampTo(hp, 0.25);
    this.lp.frequency.rampTo(lp, 0.25);
  }

  private applyOutputGain(transitioning: boolean, ramp = 0.2, mainLevel = 0.7) {
    const base = this.mix * LEVEL_GAIN[this.level];
    const duck = this.duckingEnabled ? clamp(1 - mainLevel * 0.12, 0.86, 1) : 1;
    const transitionLift = transitioning ? 1.24 : 1;
    const soloBoost = this.debugSolo ? 2.6 : 1;
    const target = this.level === 'off' ? 0 : clamp(base * duck * transitionLift * soloBoost, 0, 0.95);
    console.info('[ReverseAtmosphere] reverse output gain', { target, level: this.level, mix: this.mix, debugSolo: this.debugSolo });
    this.output.gain.rampTo(target, ramp);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopCaptureLoop();

    for (const active of this.activeSources) {
      try {
        active.source.stop();
      } catch {
        // ignore
      }
      try {
        active.source.disconnect();
      } catch {
        // ignore
      }
      try {
        active.gain.disconnect();
      } catch {
        // ignore
      }
    }

    this.activeSources.clear();

    try {
      this.input.disconnect();
    } catch {
      // ignore
    }
    try {
      this.captureTap.disconnect();
    } catch {
      // ignore
    }
    try {
      this.captureSplitter.disconnect();
    } catch {
      // ignore
    }
    try {
      this.captureAnalyserL.disconnect();
    } catch {
      // ignore
    }
    try {
      this.captureAnalyserR.disconnect();
    } catch {
      // ignore
    }
    try {
      this.hp.disconnect();
    } catch {
      // ignore
    }
    try {
      this.lp.disconnect();
    } catch {
      // ignore
    }
    try {
      this.preDelay.disconnect();
    } catch {
      // ignore
    }
    try {
      this.splitter.disconnect();
    } catch {
      // ignore
    }
    try {
      this.leftDirect.disconnect();
    } catch {
      // ignore
    }
    try {
      this.leftCross.disconnect();
    } catch {
      // ignore
    }
    try {
      this.rightDirect.disconnect();
    } catch {
      // ignore
    }
    try {
      this.rightCross.disconnect();
    } catch {
      // ignore
    }
    try {
      this.merger.disconnect();
    } catch {
      // ignore
    }
    try {
      this.wetGain.disconnect();
    } catch {
      // ignore
    }
    try {
      this.output.disconnect();
    } catch {
      // ignore
    }
  }
}
