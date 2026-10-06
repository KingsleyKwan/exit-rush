export interface DragState {
  active: boolean;
  /** Screen right, −1…1. Game.ts maps this through the camera; it is not a world axis. */
  intentX: number;
  /** Screen up, −1…1. Game.ts maps this through the camera; it is not a world axis. */
  intentZ: number;
  /** 0–1 deflection. */
  magnitude: number;
}

export interface InputCallbacks {
  onUlt?: (k: 'str' | 'spd' | 'sta') => void;
  onPause?: () => void;
}

/**
 * Floating virtual joystick: touch/click anywhere on the play area, drag to
 * steer. The base trails the finger if you overshoot, so reversing direction is
 * instant. Keyboard (WASD / arrows, Space = shove, 1-2-3 = ults, P/Esc = pause)
 * for desktop testing.
 */
export class InputController {
  readonly drag: DragState = {
    active: false,
    intentX: 0,
    intentZ: 0,
    magnitude: 0,
  };
  /** Space held (desktop shove). */
  shoveKey = false;
  /** Steering only while a level is being played. */
  enabled = false;
  cb: InputCallbacks = {};

  private el: HTMLElement;
  private pointerId: number | null = null;
  private baseX = 0;
  private baseY = 0;
  private radius = 60;
  private joy: HTMLDivElement;
  private knob: HTMLDivElement;
  private keys = new Set<string>();
  private keyX = 0;
  private keyZ = 0;
  private safeLeft = 0;
  private safeBottom = 0;

  constructor(el: HTMLElement, overlayParent: HTMLElement) {
    this.el = el;
    this.joy = document.createElement('div');
    this.joy.className = 'joy';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.joy.appendChild(this.knob);
    overlayParent.appendChild(this.joy);

    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('contextmenu', this.onContext);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    this.readSafe();
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
    this.el.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    this.joy.remove();
  }

  /** Drop any held input (e.g. on pause / screen change). */
  reset(): void {
    this.pointerId = null;
    this.drag.active = false;
    this.drag.intentX = this.drag.intentZ = this.drag.magnitude = 0;
    this.keys.clear();
    this.shoveKey = false;
    this.keyX = this.keyZ = 0;
    this.hideJoy();
  }

  private onContext = (e: Event): void => e.preventDefault();

  private onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('[data-ui]')) return;
    if (!this.enabled || this.pointerId !== null) return; // one steering finger
    this.pointerId = e.pointerId;
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.radius = Math.max(44, Math.min(80, Math.min(window.innerWidth, window.innerHeight) * 0.14));
    this.baseX = e.clientX;
    this.baseY = e.clientY;
    this.drag.active = true;
    this.drag.magnitude = 0;
    this.joy.style.setProperty('--r', `${this.radius}px`);
    this.place(0, 0);
    this.joy.classList.remove('idle');
    this.joy.classList.add('on');
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    let dx = e.clientX - this.baseX;
    let dy = e.clientY - this.baseY;
    let len = Math.hypot(dx, dy);
    const follow = this.radius * 1.25;
    if (len > follow) {
      // Drag the base along so the stick never "bottoms out".
      const k = (len - follow) / len;
      this.baseX += dx * k;
      this.baseY += dy * k;
      dx = e.clientX - this.baseX;
      dy = e.clientY - this.baseY;
      len = follow;
    }
    const raw = Math.min(1, len / this.radius);
    const dz = 0.1;
    const mag = raw <= dz ? 0 : Math.pow((raw - dz) / (1 - dz), 0.85);
    this.drag.magnitude = mag;
    if (len > 0.5) {
      this.drag.intentX = (dx / len) * mag;
      this.drag.intentZ = (-dy / len) * mag;
    }
    this.place(dx, dy);
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.drag.active = false;
    this.drag.intentX = 0;
    this.drag.intentZ = 0;
    this.drag.magnitude = 0;
    this.joy.classList.remove('on');
    if (this.enabled) this.showParked();
    else this.hideJoy();
  };

  private place(dx: number, dy: number): void {
    const r = this.radius;
    const l = Math.hypot(dx, dy);
    const k = l > r ? r / l : 1;
    this.joy.style.transform = `translate(${this.baseX}px, ${this.baseY}px)`;
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'shift') {
      this.shoveKey = true;
      e.preventDefault();
      return;
    }
    if (k === '1') this.cb.onUlt?.('str');
    else if (k === '2') this.cb.onUlt?.('spd');
    else if (k === '3') this.cb.onUlt?.('sta');
    else if (k === 'p' || k === 'escape') this.cb.onPause?.();
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'shift') this.shoveKey = false;
    this.keys.delete(k);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.shoveKey = false;
  };

  /** Keyboard smoothing; pointer input is applied immediately in handlers. */
  tick(dt: number): void {
    if (this.pointerId !== null) return;
    if (!this.enabled) {
      this.drag.intentX = this.drag.intentZ = this.drag.magnitude = 0;
      this.hideJoy();
      return;
    }
    const has = (a: string, b: string) => this.keys.has(a) || this.keys.has(b);
    let tx = (has('d', 'arrowright') ? 1 : 0) - (has('a', 'arrowleft') ? 1 : 0);
    let tz = (has('w', 'arrowup') ? 1 : 0) - (has('s', 'arrowdown') ? 1 : 0);
    const l = Math.hypot(tx, tz);
    if (l > 0) {
      tx /= l;
      tz /= l;
    }
    const s = 1 - Math.exp(-16 * dt);
    this.keyX += (tx - this.keyX) * s;
    this.keyZ += (tz - this.keyZ) * s;
    const m = Math.min(1, Math.hypot(this.keyX, this.keyZ));
    this.drag.intentX = this.keyX;
    this.drag.intentZ = this.keyZ;
    this.drag.magnitude = m < 0.02 ? 0 : m;
    this.showParked();
  }

  private onResize = (): void => {
    this.readSafe();
    if (this.enabled && this.pointerId === null) this.showParked();
  };

  /** Home-indicator / notch. env() on a custom property does not resolve via getPropertyValue. */
  private readSafe(): void {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom)';
    this.joy.appendChild(probe);
    const cs = getComputedStyle(probe);
    this.safeLeft = parseFloat(cs.paddingLeft) || 0;
    this.safeBottom = parseFloat(cs.paddingBottom) || 0;
    probe.remove();
  }

  /** Lower-left park, clear of the home indicator and the bottom-right shove cluster. */
  private showParked(): void {
    this.radius = Math.max(44, Math.min(80, Math.min(window.innerWidth, window.innerHeight) * 0.14));
    this.joy.style.setProperty('--r', `${this.radius}px`);
    this.baseX = this.radius + 28 + this.safeLeft;
    this.baseY = window.innerHeight - this.radius - 36 - this.safeBottom;
    const r = this.radius;
    this.place(this.drag.intentX * r, -this.drag.intentZ * r);
    this.joy.classList.remove('on');
    this.joy.classList.add('idle');
  }

  private hideJoy(): void {
    this.joy.classList.remove('on', 'idle');
  }
}
