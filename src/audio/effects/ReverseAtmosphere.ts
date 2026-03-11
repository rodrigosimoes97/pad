import * as Tone from 'tone';
import type { ReverseAtmosphereLevel, ReversePreDelay } from '../../types/pad';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const LEVEL_GAIN: Record<ReverseAtmosphereLevel, number> = {
  off: 0,
  light: 0.35,
  medium: 0.62,
  deep: 0.85,
};

const PRE_DELAY_TIMES: Record<ReversePreDelay, number> = {
  short: 0.12,
  medium: 0.22,
  long: 0.34,
};

export class ReverseAtmosphere {
  private input = new Tone.Gain(0.7);
  private hp = new Tone.Filter({ type: 'highpass', frequency: 190, Q: 0.3, rolloff: -12 });
  private lp = new Tone.Filter({ type: 'lowpass', frequency: 2500, Q: 0.4, rolloff: -12 });
  private width = new Tone.StereoWidener(0.55);
  private preDelay = new Tone.FeedbackDelay({ delayTime: PRE_DELAY_TIMES.medium, feedback: 0.08, wet: 1 });
  private reverseReverb = new Tone.Reverb({ decay: 3.8, preDelay: 0.03, wet: 1 });
  private swellGain = new Tone.Gain(0);
  private output = new Tone.Gain(0);

  private level: ReverseAtmosphereLevel = 'off';
  private mix = 0.14;
  private tone = 0.4;
  private duckingEnabled = true;

  constructor() {
    this.input.chain(this.hp, this.lp, this.width, this.preDelay, this.reverseReverb, this.swellGain, this.output);
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
    this.width.width.rampTo(clamp(value, 0, 1), 0.25);
  }

  setDucking(enabled: boolean) {
    this.duckingEnabled = enabled;
    this.applyOutputGain(false);
  }

  applyDuckingContext(mainLevel: number, transitioning: boolean) {
    this.applyOutputGain(transitioning, 0.12, clamp(mainLevel, 0, 1));
  }

  triggerTransitionSwell(strength = 1) {
    if (this.level === 'off') return;
    const now = Tone.now();
    const predelaySeconds = Tone.Time(this.preDelay.delayTime.value).toSeconds();
    const target = clamp((0.08 + this.mix * 0.5) * LEVEL_GAIN[this.level] * strength, 0, 0.28);

    this.swellGain.gain.cancelScheduledValues(now);
    this.swellGain.gain.setValueAtTime(0.001, now);
    this.swellGain.gain.linearRampToValueAtTime(target, now + predelaySeconds + 0.08);
    this.swellGain.gain.exponentialRampToValueAtTime(target * 0.26 + 0.001, now + predelaySeconds + 1.35);
  }

  private applyTone(tone: number) {
    const hp = 160 + tone * 170;
    const lp = 1700 + tone * 2100;
    this.hp.frequency.rampTo(hp, 0.25);
    this.lp.frequency.rampTo(lp, 0.25);
  }

  private applyOutputGain(transitioning: boolean, ramp = 0.18, mainLevel = 0.7) {
    const base = this.mix * LEVEL_GAIN[this.level];
    const duck = this.duckingEnabled ? clamp(1 - mainLevel * 0.45, 0.45, 1) : 1;
    const transitionLift = transitioning ? 1.18 : 1;
    this.output.gain.rampTo(clamp(base * duck * transitionLift, 0, 0.32), ramp);
  }

  dispose() {
    this.input.dispose();
    this.hp.dispose();
    this.lp.dispose();
    this.width.dispose();
    this.preDelay.dispose();
    this.reverseReverb.dispose();
    this.swellGain.dispose();
    this.output.dispose();
  }
}
