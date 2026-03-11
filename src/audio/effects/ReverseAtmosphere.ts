import * as Tone from 'tone';
import type { ReverseAtmosphereLevel, ReversePreDelay } from '../../types/pad';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const LEVEL_GAIN: Record<ReverseAtmosphereLevel, number> = {
  off: 0,
  light: 0.52,
  medium: 0.82,
  deep: 1.12,
};

const PRE_DELAY_TIMES: Record<ReversePreDelay, number> = {
  short: 0.14,
  medium: 0.24,
  long: 0.36,
};

export class ReverseAtmosphere {
  private input = new Tone.Gain(0.9);
  private hp = new Tone.Filter({ type: 'highpass', frequency: 150, Q: 0.22, rolloff: -12 });
  private lp = new Tone.Filter({ type: 'lowpass', frequency: 3600, Q: 0.25, rolloff: -12 });
  private width = new Tone.StereoWidener(0.68);
  private preDelay = new Tone.FeedbackDelay({ delayTime: PRE_DELAY_TIMES.medium, feedback: 0.18, wet: 1 });
  private reverseReverb = new Tone.Reverb({ decay: 5.2, preDelay: 0.04, wet: 1 });
  private textureGain = new Tone.Gain(0.24);
  private swellGain = new Tone.Gain(0);
  private output = new Tone.Gain(0);

  private level: ReverseAtmosphereLevel = 'off';
  private mix = 0.18;
  private tone = 0.52;
  private duckingEnabled = true;

  constructor() {
    this.input.chain(this.hp, this.lp, this.width, this.preDelay, this.reverseReverb, this.textureGain, this.swellGain, this.output);
  }

  async init() {
    await this.reverseReverb.generate();
    this.applyTone(this.tone);
    this.applyOutputGain(false, 0.01);
  }

  connect(destination: Tone.ToneAudioNode | AudioNode | AudioParam) {
    this.output.connect(destination);
  }

  connectInput(source: Tone.ToneAudioNode) {
    source.connect(this.input as unknown as AudioNode);
  }

  disconnectInput(source: Tone.ToneAudioNode) {
    source.disconnect(this.input as unknown as AudioNode);
  }

  setAmount(level: ReverseAtmosphereLevel) {
    this.level = level;
    this.applyOutputGain(false);
  }

  setMix(mix: number) {
    this.mix = clamp(mix, 0, 0.35);
    this.applyOutputGain(false);
  }

  setTone(tone: number) {
    this.tone = clamp(tone, 0, 1);
    this.applyTone(this.tone);
  }

  setPreDelay(mode: ReversePreDelay) {
    this.preDelay.delayTime.rampTo(PRE_DELAY_TIMES[mode], 0.2);
  }

  setWidth(value: number) {
    this.width.width.rampTo(clamp(value, 0, 1), 0.2);
  }

  setDucking(enabled: boolean) {
    this.duckingEnabled = enabled;
    this.applyOutputGain(false);
  }

  applyDuckingContext(mainLevel: number, transitioning: boolean) {
    this.applyOutputGain(transitioning, 0.14, clamp(mainLevel, 0, 1));
  }

  triggerTransitionSwell(strength = 1) {
    if (this.level === 'off') return;
    const now = Tone.now();
    const predelaySeconds = Tone.Time(this.preDelay.delayTime.value).toSeconds();
    const target = clamp((0.15 + this.mix * 0.72) * LEVEL_GAIN[this.level] * strength, 0.03, 0.52);

    this.swellGain.gain.cancelScheduledValues(now);
    this.swellGain.gain.setValueAtTime(0.004, now);
    this.swellGain.gain.linearRampToValueAtTime(target, now + predelaySeconds + 0.14);
    this.swellGain.gain.exponentialRampToValueAtTime(target * 0.42 + 0.002, now + predelaySeconds + 2.25);
  }

  private applyTone(tone: number) {
    const hp = 120 + tone * 190;
    const lp = 2200 + tone * 3600;
    this.hp.frequency.rampTo(hp, 0.25);
    this.lp.frequency.rampTo(lp, 0.25);
  }

  private applyOutputGain(transitioning: boolean, ramp = 0.2, mainLevel = 0.7) {
    const base = this.mix * LEVEL_GAIN[this.level];
    const duck = this.duckingEnabled ? clamp(1 - mainLevel * 0.22, 0.72, 1) : 1;
    const transitionLift = transitioning ? 1.24 : 1;
    const target = this.level === 'off' ? 0 : clamp(base * duck * transitionLift, 0, 0.48);
    this.output.gain.rampTo(target, ramp);
  }

  dispose() {
    this.input.dispose();
    this.hp.dispose();
    this.lp.dispose();
    this.width.dispose();
    this.preDelay.dispose();
    this.reverseReverb.dispose();
    this.textureGain.dispose();
    this.swellGain.dispose();
    this.output.dispose();
  }
}
