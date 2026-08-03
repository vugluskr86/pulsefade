export interface IHaptics {
  pulse(pattern: number | number[]): void;
  setEnabled(enabled: boolean): void;
}

export class VibrationHaptics implements IHaptics {
  private enabled = true;
  private readonly supported =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  pulse(pattern: number | number[]): void {
    if (!this.enabled || !this.supported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // на части браузеров вибрация запрещена политикой — молча игнорируем
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
