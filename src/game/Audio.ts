/**
 * Placeholder SFX via Web Audio API.
 * Labels mimic MTR-like cues but are NOT official MTR recordings.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private unlocked = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Call from first user gesture */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.08,
    when = 0,
  ): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Placeholder “door chime” — not MTR audio */
  doorOpen(): void {
    this.tone(880, 0.12, 'triangle', 0.07);
    this.tone(1174, 0.14, 'triangle', 0.06, 0.1);
  }

  doorClose(): void {
    this.tone(440, 0.2, 'square', 0.05);
    this.tone(330, 0.25, 'square', 0.04, 0.12);
  }

  /** Soft arrival arpeggio placeholder */
  arrival(): void {
    this.tone(523, 0.1, 'sine', 0.05);
    this.tone(659, 0.1, 'sine', 0.05, 0.1);
    this.tone(784, 0.15, 'sine', 0.05, 0.2);
  }

  push(): void {
    this.tone(180 + Math.random() * 40, 0.06, 'sawtooth', 0.04);
  }

  collide(): void {
    this.tone(90, 0.08, 'square', 0.035);
  }

  win(): void {
    this.tone(523, 0.12, 'sine', 0.07);
    this.tone(659, 0.12, 'sine', 0.07, 0.12);
    this.tone(784, 0.2, 'sine', 0.08, 0.24);
  }

  lose(): void {
    this.tone(392, 0.2, 'triangle', 0.06);
    this.tone(311, 0.35, 'triangle', 0.05, 0.15);
  }

  ultimate(): void {
    this.tone(220, 0.15, 'sawtooth', 0.06);
    this.tone(440, 0.2, 'sawtooth', 0.05, 0.1);
    this.tone(880, 0.25, 'sine', 0.05, 0.22);
  }

  ui(): void {
    this.tone(660, 0.05, 'sine', 0.04);
  }
}
