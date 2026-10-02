export interface DragState {
  active: boolean;
  /** Normalized push intent in XZ plane: x = left/right, z = toward door (negative z in our scene) */
  intentX: number;
  intentZ: number;
  /** 0–1 strength of current drag */
  magnitude: number;
}

/**
 * Unified mouse + touch swipe/drag toward door.
 * Screen: up / forward swipe → toward door (−Z).
 */
export class InputController {
  readonly drag: DragState = {
    active: false,
    intentX: 0,
    intentZ: 0,
    magnitude: 0,
  };

  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
  }

  private onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('[data-ui]')) return;
    this.el.setPointerCapture(e.pointerId);
    this.drag.active = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.drag.magnitude = 0;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.drag.active) return;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const dx = this.lastX - this.startX;
    const dy = this.lastY - this.startY;
    // Screen Y down positive; swipe up (negative dy) → toward door
    const len = Math.hypot(dx, dy);
    const max = Math.min(window.innerWidth, window.innerHeight) * 0.28;
    const mag = Math.min(1, len / max);
    this.drag.magnitude = mag;
    if (len > 1) {
      this.drag.intentX = (dx / len) * mag;
      this.drag.intentZ = (-dy / len) * mag; // up → +intentZ toward door in our mapping
    }
  };

  private onUp = (): void => {
    this.drag.active = false;
    this.drag.intentX *= 0.3;
    this.drag.intentZ *= 0.3;
    this.drag.magnitude *= 0.3;
  };

  /** Decay when not dragging */
  tick(dt: number): void {
    if (!this.drag.active) {
      const k = Math.exp(-6 * dt);
      this.drag.intentX *= k;
      this.drag.intentZ *= k;
      this.drag.magnitude *= k;
    }
  }
}
