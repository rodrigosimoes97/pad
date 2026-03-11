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
  private textureGain = new Tone.Gain(0.36);
  private swellGain = new Tone.Gain(0);
  private output = new Tone.Gain(0);
  private debugSolo = false;

  private level: ReverseAtmosphereLevel = 'off';
  private mix = 0.18;
  private tone = 0.52;
  private duckingEnabled = true;

  constructor() {
    this.input.chain(this.hp, this.lp, this.width, this.preDelay, this.reverseReverb);
    this.reverseReverb.connect(this.textureGain);
    this.textureGain.connect(this.output);
    this.reverseReverb.connect(this.swellGain);
    this.swellGain.connect(this.output);
  }

  async init() {
    await this.reverseReverb.generate();
    this.applyTone(this.tone);
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

  setAmount(level: ReverseAtmosphereLevel) {
    this.level = level;
    this.applyOutputGain(false);
  }

  setMix(mix: number) {
    this.mix = clamp(mix, 0, 0.7);
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
    const target = clamp((0.18 + this.mix * 0.86) * LEVEL_GAIN[this.level] * strength, 0.05, 0.82);

    console.info('[ReverseAtmosphere] reverse trigger fired', { strength, target, level: this.level });

    this.swellGain.gain.cancelScheduledValues(now);
    this.swellGain.gain.setValueAtTime(0.004, now);
    this.swellGain.gain.linearRampToValueAtTime(target, now + predelaySeconds + 0.14);
    this.swellGain.gain.exponentialRampToValueAtTime(target * 0.42 + 0.002, now + predelaySeconds + 2.25);
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
    const effectiveLevel = this.debugSolo && this.level === 'off' ? 'deep' : this.level;
    const base = this.mix * LEVEL_GAIN[effectiveLevel];
    const duck = this.duckingEnabled ? clamp(1 - mainLevel * 0.12, 0.86, 1) : 1;
    const transitionLift = transitioning ? 1.24 : 1;
    const soloBoost = this.debugSolo ? 2.6 : 1;
    const target = clamp(base * duck * transitionLift * soloBoost, 0, 0.95);
  
    console.info('[ReverseAtmosphere] reverse output gain', {
      target,
      level: this.level,
      effectiveLevel,
      mix: this.mix,
      debugSolo: this.debugSolo,
    });
  
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
