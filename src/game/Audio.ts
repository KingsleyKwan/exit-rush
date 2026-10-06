/** HCR Web Audio SFX — original synth only. */
export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}
export const DEFAULT_AUDIO: AudioSettings = {
  master: 1,
  music: 0.55,
  sfx: 0.9,
  muted: false,
};
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private unlocked = false;
  private lastThud = 0;
  private settings: AudioSettings = { ...DEFAULT_AUDIO };
  private ambientNodes: AudioNode[] = [];
  private ambientGain: GainNode | null = null;
  private ambientWant = 0;
  private warnPair = 0;
  private logOnce = false;
  applySettings(s: Partial<AudioSettings> | null | undefined): void {
    const d = DEFAULT_AUDIO;
    this.settings = {
      master: clamp01(typeof s?.master === 'number' ? s.master : d.master),
      music: clamp01(typeof s?.music === 'number' ? s.music : d.music),
      sfx: clamp01(typeof s?.sfx === 'number' ? s.sfx : d.sfx),
      muted: s?.muted === true,
    };
    this.syncGains();
  }
  getSettings(): AudioSettings {
    return { ...this.settings };
  }
  setMaster(v: number): void {
    this.settings.master = clamp01(v);
    this.syncGains();
  }
  setMusic(v: number): void {
    this.settings.music = clamp01(v);
    this.syncGains();
  }
  setSfx(v: number): void {
    this.settings.sfx = clamp01(v);
    this.syncGains();
  }
  setMuted(m: boolean): void {
    this.settings.muted = m;
    this.syncGains();
  }
  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.syncGains();
    return this.settings.muted;
  }
  private syncGains(): void {
    if (!this.master || !this.musicBus || !this.sfxBus) return;
    const m = this.settings.muted ? 0 : this.settings.master;
    this.master.gain.value = m;
    this.musicBus.gain.value = this.settings.music;
    this.sfxBus.gain.value = this.settings.sfx;
  }
  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.syncGains();
      if (!this.logOnce) {
        this.logOnce = true;
        console.info('[audio] AudioContext + master/music/sfx buses created (original synth)');
      }
    }
    return this.ctx;
  }
  unlock(): void {
    try {
      const ctx = this.ensure();
      if (ctx.state !== 'running' && !this.isHidden()) void ctx.resume().catch(() => undefined);
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }
  private isHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden;
  }
  suspend(): void {
    const ctx = this.ctx;
    if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
  }
  resume(): void {
    const ctx = this.ctx;
    if (!ctx || !this.unlocked || this.isHidden()) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
  }
  private sfx(): AudioNode {
    this.ensure();
    return this.sfxBus!;
  }
  private music(): AudioNode {
    this.ensure();
    return this.musicBus!;
  }
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.08,
    when = 0,
    slideTo?: number,
    bus: 'sfx' | 'music' = 'sfx',
  ): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(bus === 'music' ? this.music() : this.sfx());
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  private noise(
    duration: number,
    gain: number,
    freq: number,
    q = 1,
    when = 0,
    sweepTo?: number,
    bus: 'sfx' | 'music' = 'sfx',
  ): void {
    if (!this.unlocked) return;
    const ctx = this.ensure();
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.8);
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
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t0 + duration);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(f);
    f.connect(g);
    g.connect(bus === 'music' ? this.music() : this.sfx());
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + duration + 0.02);
  }
  warnBeep(urgency: number): void {
    const hi = 1480 + urgency * 220;
    const lo = 1180 + urgency * 180;
    const g = 0.04 + urgency * 0.025;
    if (this.warnPair % 2 === 0) {
      this.tone(hi, 0.055, 'square', g);
      this.tone(lo, 0.055, 'square', g * 0.85, 0.06);
    } else {
      this.tone(lo, 0.055, 'square', g);
      this.tone(hi, 0.055, 'square', g * 0.85, 0.06);
    }
    this.warnPair++;
  }
  arrival(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 987.77];
    notes.forEach((f, i) => this.tone(f, 0.14 + (i === notes.length - 1 ? 0.12 : 0), 'triangle', 0.055, i * 0.09));
    this.tone(1318.5, 0.28, 'sine', 0.03, 0.55);
  }
  announce(_lang: 'en' | 'zh-HK' = 'zh-HK'): void {
    this.jrDepartureMelody();
  }
  jrDepartureMelody(): void {
    const notes: Array<[number, number, number]> = [
      [523.25, 0.22, 0.0],
      [587.33, 0.22, 0.2],
      [659.25, 0.28, 0.4],
      [783.99, 0.18, 0.7],
      [659.25, 0.18, 0.88],
      [587.33, 0.22, 1.06],
      [523.25, 0.35, 1.28],
      [392.0, 0.45, 1.55],
    ];
    notes.forEach(([f, d, w]) => this.tone(f, d, 'triangle', 0.045, w, undefined, 'music'));
    this.tone(1046.5, 0.4, 'sine', 0.02, 1.9, undefined, 'music');
    this.tone(1318.5, 0.35, 'sine', 0.015, 2.05, undefined, 'music');
  }
  doorOpen(): void {
    this.noise(0.35, 0.14, 900, 0.7, 0, 280);
    this.noise(0.22, 0.08, 2200, 1.2, 0.05, 600);
    this.tone(140, 0.08, 'sine', 0.05, 0.28, 70);
    this.tone(90, 0.06, 'triangle', 0.04, 0.32);
  }
  doorClose(): void {
    this.noise(0.3, 0.12, 400, 0.8, 0, 180);
    this.tone(220, 0.12, 'square', 0.035, 0.05, 110);
    this.tone(90, 0.1, 'sine', 0.06, 0.22, 50);
    this.noise(0.08, 0.1, 120, 2, 0.28);
  }
  depart(): void {
    this.noise(1.4, 0.1, 90, 0.6, 0, 40, 'music');
    this.tone(55, 1.2, 'sine', 0.05, 0, 35, 'music');
    this.noise(0.8, 0.06, 200, 1, 0.3, 80, 'music');
  }
  startAmbience(density: number, finale = false): void {
    this.stopAmbience();
    if (!this.unlocked) return;
    const ctx = this.ensure();
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.2);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(this.music());
    this.ambientGain = g;
    this.ambientWant = 0.018 + Math.min(10, density) * 0.006 + (finale ? 0.02 : 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    src.start();
    this.ambientNodes = [src, bp, lp, g];
    const t0 = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(this.ambientWant, t0 + 0.8);
    if (finale) {
      this.scheduleFireworks(t0 + 1.2);
    }
    console.info('[audio] ambience started density=', density, 'finale=', finale);
  }
  private fireworksOn = false;
  private scheduleFireworks(when: number): void {
    this.fireworksOn = true;
    if (!this.unlocked || !this.ctx || !this.fireworksOn) return;
    const ctx = this.ctx;
    const delay = 0.9 + Math.random() * 2.4;
    const t0 = Math.max(ctx.currentTime, when);
    const pop = () => {
      if (!this.fireworksOn || !this.unlocked) return;
      this.noise(0.25, 0.07, 180, 0.5, 0, 60, 'music');
      this.tone(90, 0.15, 'sine', 0.03, 0, 40, 'music');
      this.noise(0.4, 0.04, 2400, 0.4, 0.05, 800, 'music');
      if (this.fireworksOn) {
        window.setTimeout(() => this.scheduleFireworks(0), delay * 1000);
      }
    };
    const wait = Math.max(0, (t0 - ctx.currentTime) * 1000);
    window.setTimeout(pop, wait);
  }
  stopAmbience(): void {
    this.fireworksOn = false;
    const g = this.ambientGain;
    const ctx = this.ctx;
    if (g && ctx) {
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      } catch {
      }
    }
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    this.ambientGain = null;
    window.setTimeout(() => {
      for (const n of nodes) {
        try {
          if ('stop' in n && typeof (n as AudioBufferSourceNode).stop === 'function') {
            (n as AudioBufferSourceNode).stop();
          }
          n.disconnect();
        } catch {
        }
      }
    }, 400);
  }
  push(): void {
    this.tone(180 + Math.random() * 40, 0.06, 'sawtooth', 0.04);
  }
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
  shove(power: number): void {
    this.noise(0.18, 0.12 + power * 0.1, 500, 0.9, 0, 160);
    this.tone(150, 0.12, 'triangle', 0.06 + power * 0.04, 0, 70);
  }
  /** 大聲公: muffled phone-chatter syllables (band-passed noise + low buzz), louder deeper in the zone. */
  chatter(intensity: number): void {
    const n = 2 + Math.floor(Math.random() * 2);
    const g = 0.025 + intensity * 0.035;
    for (let i = 0; i < n; i++) {
      const w = i * (0.07 + Math.random() * 0.03);
      this.noise(0.06, g, 700 + Math.random() * 700, 4, w);
      this.tone(170 + Math.random() * 90, 0.055, 'square', g * 0.35, w, 140 + Math.random() * 60);
    }
  }
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
  skillPoint(): void {
    this.tone(880, 0.08, 'sine', 0.06);
    this.tone(1320, 0.12, 'triangle', 0.05, 0.07);
    this.tone(1760, 0.18, 'sine', 0.035, 0.14);
  }
  win(): void {
    const n = [523.25, 659.25, 783.99, 1046.5];
    n.forEach((f, i) => this.tone(f, 0.14, 'sine', 0.07, i * 0.11));
    this.tone(1318.5, 0.35, 'triangle', 0.05, 0.45);
    this.tone(1568, 0.4, 'sine', 0.03, 0.55);
  }
  lose(): void {
    this.tone(392, 0.18, 'sawtooth', 0.05);
    this.tone(311, 0.22, 'sawtooth', 0.045, 0.14);
    this.tone(233, 0.4, 'triangle', 0.05, 0.28);
    this.noise(0.35, 0.06, 180, 1, 0.2);
  }
  ultimate(): void {
    this.tone(220, 0.15, 'sawtooth', 0.06);
    this.tone(440, 0.2, 'sawtooth', 0.05, 0.1);
    this.tone(880, 0.25, 'sine', 0.05, 0.22);
  }
  shockwave(): void {
    this.tone(90, 0.5, 'sine', 0.16, 0, 35);
    this.noise(0.5, 0.25, 400, 0.6, 0, 80);
    this.tone(220, 0.15, 'sawtooth', 0.05);
  }
  dash(): void {
    this.noise(0.4, 0.18, 300, 1.5, 0, 2400);
    this.tone(440, 0.25, 'triangle', 0.04, 0, 1200);
  }
  sense(): void {
    [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.035, i * 0.06));
  }
  ui(): void {
    this.tone(720, 0.04, 'sine', 0.035);
    this.tone(960, 0.05, 'triangle', 0.025, 0.03);
  }
  /** Short buzz when the player pushes a closed door. */
  deny(): void {
    this.tone(90, 0.09, 'square', 0.05);
    this.tone(70, 0.12, 'sawtooth', 0.035, 0.05, 40);
    this.noise(0.1, 0.08, 180, 1.2, 0.02, 60);
  }
}
function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}
