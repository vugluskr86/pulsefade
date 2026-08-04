import type { Grade } from '../domain/Judgement';
import type { IAudio, SoundSetId } from './IAudio';

/** Мажорная пентатоника: перезвон не расстраивается на длинных сериях. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16] as const;

/** Синтез без ассетов: три набора откликов из магазина, все — на осцилляторах. */
export class WebAudioEngine implements IAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private style: SoundSetId = 'sound_default';

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

  setStyle(style: string): void {
    this.style = (['sound_default', 'sound_chime', 'sound_techno'] as const).includes(style as SoundSetId)
      ? (style as SoundSetId)
      : 'sound_default';
  }

  hit(grade: Grade, multiplier: number): void {
    switch (this.style) {
      case 'sound_chime': return this.chime(grade, multiplier);
      case 'sound_techno': return this.techno(grade, multiplier);
      default: return this.click(grade, multiplier);
    }
  }

  tick(): void {
    if (this.style === 'sound_chime') this.blip(660, 0.05, 'sine', 0.12);
    else if (this.style === 'sound_techno') this.blip(90, 0.05, 'square', 0.2);
    else this.blip(300, 0.03, 'square', 0.18);
  }

  /** Щелчки — исходный набор: короткий тон, высота растёт с множителем. */
  private click(grade: Grade, multiplier: number): void {
    if (grade === 'miss') {
      this.blip(120, 0.16, 'sawtooth', 0.5);
      return;
    }
    const base = grade === 'perfect' ? 880 : grade === 'great' ? 660 : 480;
    const step = Math.min(multiplier - 1, 7);
    this.blip(base * Math.pow(2, step / 12), grade === 'perfect' ? 0.09 : 0.07, 'triangle', 0.9);
    if (grade === 'perfect') this.blip(base * 2, 0.05, 'sine', 0.4);
  }

  /** Колокольчики — длинный синусовый звон с квинтой и мягким послезвучием. */
  private chime(grade: Grade, multiplier: number): void {
    if (grade === 'miss') {
      this.blip(196, 0.5, 'sine', 0.35, 0.9);
      return;
    }
    const step = PENTATONIC[Math.min(multiplier - 1, PENTATONIC.length - 1)] ?? 0;
    const root = (grade === 'perfect' ? 587.33 : grade === 'great' ? 440 : 392) * Math.pow(2, step / 12);
    this.blip(root, grade === 'perfect' ? 0.9 : 0.6, 'sine', 0.75, 0.85);
    this.blip(root * 1.5, 0.55, 'sine', 0.28, 0.8);
    if (grade === 'perfect') this.blip(root * 3, 0.8, 'sine', 0.16, 0.9, 0.06);
  }

  /** Техно — сухой клик с падающей высотой и подбитый сабом. */
  private techno(grade: Grade, multiplier: number): void {
    if (grade === 'miss') {
      this.sweep(160, 40, 0.22, 'sawtooth', 0.6);
      return;
    }
    const step = Math.min(multiplier - 1, 7);
    const top = (grade === 'perfect' ? 1400 : grade === 'great' ? 1050 : 800) * Math.pow(2, step / 24);
    this.sweep(top, top * 0.35, grade === 'perfect' ? 0.075 : 0.055, 'square', 0.55);
    this.sweep(150, 55, 0.13, 'sine', grade === 'perfect' ? 0.85 : 0.5);
    if (grade === 'perfect') this.blip(top * 1.5, 0.03, 'sawtooth', 0.3, 0.4, 0.02);
  }

  private blip(
    frequency: number, duration: number, type: OscillatorType, gain: number,
    curve = 0.4, delay = 0,
  ): void {
    const ctx = this.prepare();
    if (!ctx) return;
    const { context, master } = ctx;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.004);
    // Длинный «хвост» звона задаётся точкой перегиба curve, короткий щелчок — малым curve.
    envelope.gain.exponentialRampToValueAtTime(Math.max(gain * 0.18, 0.0002), now + duration * curve);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType, gain: number): void {
    const ctx = this.prepare();
    if (!ctx) return;
    const { context, master } = ctx;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(to, 20), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private prepare(): { context: AudioContext; master: GainNode } | null {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.enabled) return null;
    return { context, master };
  }
}
