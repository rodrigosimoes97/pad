import * as Tone from 'tone';
import type { ReverseAtmosphereLevel, ReversePreDelay } from '../../types/pad';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const LEVEL_GAIN: Record<ReverseAtmosphereLevel, number> = {
  off: 0,
  light: 0.22,
  medium: 0.34,
  deep: 0.5,
};

const WINDOW_SECONDS: Record<Exclude<ReverseAtmosphereLevel, 'off'>, number> = {
  light: 0.42,
  medium: 0.72,
  deep: 1.08,
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
  private readonly liveCtx: AudioContext;

  private readonly input: GainNode;
  private readonly captureTap: GainNode;

  private readonly captureSplitter: ChannelSplitterNode;
  private readonly captureAnalyserL: AnalyserNode;
  private readonly captureAnalyserR: AnalyserNode;
  private readonly captureBufferL: Float32Array;
  private readonly captureBufferR: Float32Array;

  private readonly output: GainNode;
  private readonly wetGain: GainNode;

  private readonly hp: BiquadFilterNode;
  private readonly lp: BiquadFilterNode;
  private readonly preDelay: DelayNode;

  private readonly splitter: ChannelSplitterNode;
  private readonly merger: ChannelMergerNode;
  private readonly leftDirect: GainNode;
  private readonly leftCross: GainNode;
  private readonly rightDirect: GainNode;
  private readonly rightCross: GainNode;

  private readonly ringLength: number;
  private readonly ringL: Float32Array;
  private readonly ringR: Float32Array;
  private writeIndex = 0;
  private capturedSamples = 0;

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
    const raw = Tone.getContext().rawContext as AudioContext;

    if (
      !raw ||
      typeof raw.createGain !== 'function' ||
      typeof raw.createBuffer !== 'function' ||
      typeof raw.createBufferSource !== 'function' ||
      typeof raw.createDelay !== 'function' ||
      typeof raw.createAnalyser !== 'function' ||
      typeof raw.currentTime !== 'number'
    ) {
      throw new Error('ReverseAtmosphere could not access a valid audio context');
    }

    this.liveCtx = raw;

    this.input = this.liveCtx.createGain();
    this.input.gain.value = 1;

    this.captureTap = this.liveCtx.createGain();
    this.captureTap.gain.value = 1;

    this.captureSplitter = this.liveCtx.createChannelSplitter(2);

    this.captureAnalyserL = this.liveCtx.createAnalyser();
    this.captureAnalyserL.fftSize = 2048;
    this.captureAnalyserL.smoothingTimeConstant = 0;

    this.captureAnalyserR = this.liveCtx.createAnalyser();
    this.captureAnalyserR.fftSize = 2048;
    this.captureAnalyserR.smoothingTimeConstant = 0;

    this.captureBufferL = new Float32Array(this.captureAnalyserL.fftSize);
    this.captureBufferR = new Float32Array(this.captureAnalyserR.fftSize);

    this.output = this.liveCtx.createGain();
    this.output.gain.value = 0;

    this.wetGain = this.liveCtx.createGain();
    this.wetGain.gain.value = 0;

    this.hp = this.liveCtx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 150;
    this.hp.Q.value = 0.22;

    this.lp = this.liveCtx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 3600;
    this.lp.Q.value = 0.25;

    this.preDelay = this.liveCtx.createDelay(1.5);
    this.preDelay.delayTime.value = PRE_DELAY_TIMES.medium;

    this.splitter = this.liveCtx.createChannelSplitter(2);
    this.merger = this.liveCtx.createChannelMerger(2);
    this.leftDirect = this.liveCtx.createGain();
    this.leftCross = this.liveCtx.createGain();
    this.rightDirect = this.liveCtx.createGain();
    this.rightCross = this.liveCtx.createGain();

    this.ringLength = Math.ceil(this.liveCtx.sampleRate * 2.4);
    this.ringL = new Float32Array(this.ringLength);
    this.ringR = new Float32Array(this.ringLength);

    this.input.connect(this.captureTap);
    this.captureTap.connect(this.captureSplitter);
    this.captureSplitter.connect(this.captureAnalyserL, 0);
    this.captureSplitter.connect(this.captureAnalyserR, 1);

    this.hp.connect(this.lp);
    this.lp.connect(this.preDelay);
    this.preDelay.connect(this.splitter);

    this.splitter.connect(this.leftDirect, 0);
    this.splitter.connect(this.leftCross, 1);
    this.splitter.connect(this.rightDirect, 1);
    this.splitter.connect(this.rightCross, 0);

    this.leftDirect.connect(this.merger, 0, 0);
    this.leftCross.connect(this.merger, 0, 0);
    this.rightDirect.connect(this.merger, 0, 1);
    this.rightCross.connect(this.merger, 0, 1);

    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.output);

    this.applyTone(this.tone);
    this.applyWidth(this.width);
    this.applyOutputGain(false, 0.01);
  }

  async init(): Promise<void> {
    this.initialized = true;
    this.startCaptureLoop();
  }

  private startCaptureLoop(): void {
    if (this.captureRafId !== null) return;

    const tick = () => {
      if (this.disposed) return;

      this.captureAnalyserL.getFloatTimeDomainData(this.captureBufferL);
      this.captureAnalyserR.getFloatTimeDomainData(this.captureBufferR);

      for (let i = 0; i < this.captureBufferL.length; i += 1) {
        this.ringL[this.writeIndex] = this.captureBufferL[i];
        this.ringR[this.writeIndex] = this.captureBufferR[i];
        this.writeIndex = (this.writeIndex + 1) % this.ringLength;
      }

      this.capturedSamples = Math.min(
        this.capturedSamples + this.captureBufferL.length,
        this.ringLength,
      );

      this.captureRafId = window.requestAnimationFrame(tick);
    };

    this.captureRafId = window.requestAnimationFrame(tick);
  }

  private stopCaptureLoop(): void {
    if (this.captureRafId !== null) {
      window.cancelAnimationFrame(this.captureRafId);
      this.captureRafId = null;
    }
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

  setMix(mix: number): void {
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

  private reverseBufferWithEnvelope(buffer: AudioBuffer, strength: number): AudioBuffer {
    const length = buffer.length;
    const out = this.liveCtx.createBuffer(2, length, buffer.sampleRate);
    const inL = buffer.getChannelData(0);
    const inR = buffer.getChannelData(1);
    const outL = out.getChannelData(0);
    const outR = out.getChannelData(1);

    const fadeInSamples = Math.max(48, Math.floor(buffer.sampleRate * 0.01));
    const fadeOutSamples = Math.max(96, Math.floor(buffer.sampleRate * 0.018));

    for (let i = 0; i < length; i += 1) {
      const srcIndex = length - 1 - i;

      let env = Math.pow(i / Math.max(1, length - 1), 1.8);
      env *= 0.8 + strength * 0.24;

      if (i < fadeInSamples) {
        env *= i / fadeInSamples;
      }

      const tailIndex = length - 1 - i;
      if (tailIndex < fadeOutSamples) {
        env *= tailIndex / fadeOutSamples;
      }

      outL[i] = inL[srcIndex] * env;
      outR[i] = inR[srcIndex] * env;
    }

    return out;
  }

  private applyTone(tone: number): void {
    const hp = 110 + tone * 220;
    const lp = 1800 + tone * 5200;

    this.hp.frequency.setTargetAtTime(hp, this.liveCtx.currentTime, 0.03);
    this.lp.frequency.setTargetAtTime(lp, this.liveCtx.currentTime, 0.03);
  }

  private applyWidth(width: number): void {
    const direct = 0.5 + width * 0.5;
    const cross = 0.5 - width * 0.5;

    this.leftDirect.gain.setTargetAtTime(direct, this.liveCtx.currentTime, 0.02);
    this.rightDirect.gain.setTargetAtTime(direct, this.liveCtx.currentTime, 0.02);
    this.leftCross.gain.setTargetAtTime(cross, this.liveCtx.currentTime, 0.02);
    this.rightCross.gain.setTargetAtTime(cross, this.liveCtx.currentTime, 0.02);
  }

  private applyOutputGain(
    transitioning: boolean,
    ramp = 0.14,
    mainLevel = 0.7,
  ): void {
    const effectiveLevel: ReverseAtmosphereLevel =
      this.debugSolo && this.level === 'off' ? 'deep' : this.level;

    if (effectiveLevel === 'off') {
      this.output.gain.setTargetAtTime(0, this.liveCtx.currentTime, ramp);
      this.wetGain.gain.setTargetAtTime(0, this.liveCtx.currentTime, ramp);
      return;
    }

    const base = clamp(this.mix * 1.25, 0, 1) * LEVEL_GAIN[effectiveLevel];
    const duck = this.duckingEnabled ? clamp(1 - mainLevel * 0.22, 0.62, 1) : 1;
    const transitionLift = transitioning ? 1.12 : 1;
    const soloBoost = this.debugSolo ? 1.2 : 1;

    const wet = clamp(base * duck * transitionLift * soloBoost, 0.02, 0.72);
    const out = clamp(0.62 + wet * 0.6, 0.4, 1);

    this.wetGain.gain.setTargetAtTime(wet, this.liveCtx.currentTime, ramp);
    this.output.gain.setTargetAtTime(out, this.liveCtx.currentTime, ramp);
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
