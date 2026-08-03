import type { Grade } from '../domain/Judgement';
import type { IAudio } from './IAudio';

/** Синтез без ассетов: короткий щелчок, высота зависит от оценки и множителя. */
export class WebAudioEngine implements IAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  unlock(): void {
    if (!this.enabled) return;
    if (!this.context) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.context.destination);
    }
    void this.context.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.28 : 0;
  }

  hit(grade: Grade, multiplier: number): void {
    if (grade === 'miss') {
      this.blip(120, 0.16, 'sawtooth', 0.5);
      return;
    }
    const base = grade === 'perfect' ? 880 : grade === 'great' ? 660 : 480;
    const step = Math.min(multiplier - 1, 7);
    this.blip(base * Math.pow(2, step / 12), grade === 'perfect' ? 0.09 : 0.07, 'triangle', 0.9);
    if (grade === 'perfect') this.blip(base * 2, 0.05, 'sine', 0.4);
  }

  tick(): void {
    this.blip(300, 0.03, 'square', 0.18);
  }

  private blip(frequency: number, duration: number, type: OscillatorType, gain: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.enabled) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
