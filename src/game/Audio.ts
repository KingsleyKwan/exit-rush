/**
 * Placeholder SFX via Web Audio API (all synthesized at runtime).
 * Labels mimic MTR-like cues but are NOT official MTR recordings.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private unlocked = false;
  private lastThud = 0;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Call from first user gesture */
  unlock(): void {
    try {
      const ctx = this.ensure();
      if (ctx.state === 'suspended') void ctx.resume();
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  private out(): AudioNode {
    return this.master ?? this.ensure().destination;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.08,
    when = 0,
    slideTo?: number,
  ): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.out());
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Filtered noise burst — puffs, thuds, whooshes. */
  private noise(duration: number, gain: number, freq: number, q = 1, when = 0, sweepTo?: number): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.6);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.out());
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + duration + 0.02);
  }

  /** Placeholder “door chime” — not MTR audio */
  doorOpen(): void {
    this.tone(880, 0.12, 'triangle', 0.07);
    this.tone(1174, 0.14, 'triangle', 0.06, 0.1);
  }

  doorClose(): void {
    this.tone(440, 0.2, 'square', 0.05);
    this.tone(330, 0.25, 'square', 0.04, 0.12);
    this.noise(0.25, 0.12, 300, 0.8, 0.18);
  }

  /** Door-closing warning beep; urgency 0–1 raises pitch. */
  warnBeep(urgency: number): void {
    const f = 1250 + urgency * 450;
    this.tone(f, 0.07, 'square', 0.035 + urgency * 0.02);
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

  /** Body bump — heavier = lower. Throttled. */
  thud(power: number): void {
    if (!this.unlocked) return;
    const now = this.ensure().currentTime;
    if (now - this.lastThud < 0.07) return;
    this.lastThud = now;
    const p = Math.min(1, power / 4);
    this.noise(0.09 + p * 0.06, 0.05 + p * 0.1, 220 - p * 90, 1.2);
    this.tone(110 - p * 40, 0.08, 'sine', 0.04 + p * 0.05, 0, 60);
  }

  collide(): void {
    this.thud(2);
  }

  /** Player shove burst. */
  shove(power: number): void {
    this.noise(0.18, 0.12 + power * 0.1, 500, 0.9, 0, 160);
    this.tone(150, 0.12, 'triangle', 0.06 + power * 0.04, 0, 70);
  }

  /** Angry man: wind-up grunt and hit. */
  angryWindup(): void {
    this.tone(95, 0.22, 'sawtooth', 0.035, 0, 140);
  }
  angryHit(): void {
    this.noise(0.22, 0.25, 260, 0.7, 0, 90);
    this.tone(70, 0.2, 'square', 0.07, 0, 40);
  }

  winded(): void {
    this.noise(0.35, 0.05, 900, 2, 0, 400);
    this.noise(0.35, 0.04, 800, 2, 0.4, 350);
  }

  milestone(pct: number): void {
    this.tone(660 + pct * 440, 0.08, 'sine', 0.045);
  }

  win(): void {
    this.tone(523, 0.12, 'sine', 0.07);
    this.tone(659, 0.12, 'sine', 0.07, 0.12);
    this.tone(784, 0.2, 'sine', 0.08, 0.24);
    this.tone(1046, 0.3, 'triangle', 0.05, 0.36);
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

  /** STR ult: low boom + debris noise. */
  shockwave(): void {
    this.tone(90, 0.5, 'sine', 0.16, 0, 35);
    this.noise(0.5, 0.25, 400, 0.6, 0, 80);
    this.tone(220, 0.15, 'sawtooth', 0.05);
  }

  /** SPD ult: whoosh. */
  dash(): void {
    this.noise(0.4, 0.18, 300, 1.5, 0, 2400);
    this.tone(440, 0.25, 'triangle', 0.04, 0, 1200);
  }

  /** WIS ult: shimmer. */
  sense(): void {
    [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.035, i * 0.06));
  }

  ui(): void {
    this.tone(660, 0.05, 'sine', 0.04);
  }
}
