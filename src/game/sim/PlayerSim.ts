import { PASS_KID, PASS_LUGGAGE, PASS_SQUAT, applyImpulse, createBody, setMass, type Body, type World } from './Physics';
import type { SkillModifiers } from '../SkillTree';
import type { PlayerMods } from '../charactersDef';
import type { CrowdSim } from './CrowdSim';
import { PASSENGER_DEFS } from '../PassengerTypes';
import type { Emit, UltKind } from './events';
import { DOOR_Z, PLAYER_START_X, PLAYER_START_Z, TUNING, doorWallX } from './tuning';

export interface PlayerInput {
  /** World +X. Negative walks toward the −X doors. Screen axes are converted before this. */
  x: number;
  /** Negated on use (`dz = -z`), so +z is world −Z, along the car. Not toward the doors. */
  z: number;
  /** 0–1 stick deflection. */
  mag: number;
  shoveHeld: boolean;
}

export interface PathPoint {
  x: number;
  z: number;
}

const ULTS: UltKind[] = ['str', 'spd', 'sta'];

export class PlayerSim {
  readonly body: Body;
  mods: SkillModifiers;
  stamina: number;
  staminaMax: number;
  winded = false;
  shoveCd = 0;
  shoveCharge = 0;
  private shoveWasHeld = false;
  stunT = 0;
  chargeUntil = 0;
  dashUntil = 0;
  ironUntil = 0;
  ultCd: Record<UltKind, number> = { str: 0, spd: 0, sta: 0 };
  /** Cooldowns for Tier3 actives (SPD 飛身 Leap, STA 回魂 Second Wind). */
  activeCd: { leap: number; wind: number } = { leap: 0, wind: 0 };
  // ---- v0.8 mage
  mana = 0;
  manaMax = 0;
  /** Per-spell cooldown remaining (ability id → s). */
  spellCd: Record<string, number> = {};
  /** Thunder Step / similar: phase past squat+kid until. */
  phaseUntil = 0;
  manaRegenBurstUntil = 0;
  manaRegenBurstMul = 1;
  blinkSpeedMul = 1;
  /** Last cast failed for mana (HUD buzz). */
  manaDeniedT = 0;
  /** Set by Sim when mage Burning Urgency window is active. */
  burningUrgencyActive = false;
  /** SPD 50 Leap airtime ends at this sim time. */
  leapUntil = 0;
  leapStart = 0;
  /** SPD 40 Hurdle: visual hop over luggage ends at this sim time. */
  hopUntil = 0;
  hopStart = 0;
  /** Counter-skill telemetry (tests / debugging). */
  stats = { hops: 0, leaps: 0, splits: 0, shakeOffs: 0, pushDrain: 0, loudDrain: 0 };
  /** 大聲公: current loudmouth noise drain (stamina/s) — HUD indicator + stamina-bar pulse. */
  noiseDrain = 0;
  /** Smoothed, assisted move direction (unit, world XZ). */
  aimX = 0;
  aimZ = -1;
  /** Last facing direction (unit). */
  faceX = 0;
  faceZ = -1;
  /** 0–1 how much the stick is driving right now. */
  moving = 0;
  pushing = false;
  /** 0–1 current crowd-drag slow (shuffling through a packed crowd). */
  drag = 0;
  path: PathPoint[] = [];
  /** Nearest open side-door bay Z (set by Sim each step). */
  targetDoorZ = DOOR_Z;
  private pathT = 0;
  private tmp: Body[] = [];
  /** Gear L consumables packed this run (removed as they are used). */
  consumables: string[] = [];
  espressoUntil = 0;
  mintUntil = 0;

  constructor(mods: SkillModifiers) {
    const P = TUNING.player;
    this.mods = mods;
    this.body = createBody({
      x: PLAYER_START_X,
      z: PLAYER_START_Z,
      r: P.radius,
      mass: P.baseMass + mods.resist * P.massPerResist,
      damping: P.damping,
      restitution: 0.05,
      maxSpeed: 9,
    });
    this.staminaMax = mods.staminaMax;
    // STA T2b buffer is spendable but does not raise the regen cap.
    this.stamina = this.staminaMax + mods.staminaBuffer;
    const pm = mods as SkillModifiers & Partial<PlayerMods>;
    this.manaMax = pm.manaMax ?? 0;
    this.mana = this.manaMax;
    this.consumables = [...(pm.techConsumables ?? [])];
  }

  isCharging(now: number): boolean {
    return now < this.chargeUntil;
  }
  isDashing(now: number): boolean {
    return now < this.dashUntil;
  }
  isIronStance(now: number): boolean {
    return now < this.ironUntil;
  }
  isLeaping(now: number): boolean {
    return now < this.leapUntil;
  }
  /** Visual height (m) of the hop / leap arc for the view. */
  airHeight(now: number): number {
    if (now < this.leapUntil) {
      const u = (now - this.leapStart) / Math.max(1e-3, this.leapUntil - this.leapStart);
      return Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * 0.62;
    }
    if (now < this.hopUntil) {
      const u = (now - this.hopStart) / Math.max(1e-3, this.hopUntil - this.hopStart);
      return Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * 0.32;
    }
    return 0;
  }
  /** @deprecated path highlight removed with WIS; kept false for Effects callers. */
  isSensing(_now: number): boolean {
    return false;
  }

  baseMass(): number {
    const P = TUNING.player;
    const pm = this.mods as SkillModifiers & Partial<PlayerMods>;
    const base = pm.mass0 ?? P.baseMass;
    return base + this.mods.resist * P.massPerResist;
  }

  step(dt: number, now: number, input: PlayerInput, world: World, crowd: CrowdSim, emit: Emit): void {
    const P = TUNING.player;
    const U = TUNING.ult;
    const b = this.body;
    const charging = this.isCharging(now);
    const dashing = this.isDashing(now);
    const iron = this.isIronStance(now);

    this.shoveCd = Math.max(0, this.shoveCd - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    for (const k of ULTS) this.ultCd[k] = Math.max(0, this.ultCd[k] - dt);
    this.activeCd.leap = Math.max(0, this.activeCd.leap - dt);
    this.activeCd.wind = Math.max(0, this.activeCd.wind - dt);
    for (const k of Object.keys(this.spellCd)) this.spellCd[k] = Math.max(0, (this.spellCd[k] ?? 0) - dt);
    this.manaDeniedT = Math.max(0, this.manaDeniedT - dt);
    const leaping = this.isLeaping(now);
    const phasing = now < this.phaseUntil;
    // Tier 3 pass-through: Hurdle (luggage) always; Leap (squat + kids) while airborne; Thunder Step while phasing.
    const mageMods = this.mods as { characterId?: string; iceGlide?: boolean };
    const magePhase = phasing && mageMods.characterId === 'mage';
    b.passMask =
      (this.mods.hurdle || magePhase ? PASS_LUGGAGE : 0) |
      ((leaping || phasing) ? PASS_SQUAT | PASS_KID : 0);
    // Mage: slip through any currently-frozen obstacle (Flash Freeze / Ice Age pathing).
    if (mageMods.characterId === 'mage') {
      for (const a of crowd.agents) {
        if (a.freezeUntil > now || (mageMods.iceGlide && a.chillUntil > now)) {
          b.passMask |= PASS_SQUAT | PASS_KID | PASS_LUGGAGE;
          break;
        }
      }
    }
    // Ice Glide: squatters no longer add lateral weave (handled below) + shoveMul via mods flag.
    if (this.mods.hurdle && now >= this.hopUntil && this.overlapsTag(world, PASS_LUGGAGE)) {
      this.hopStart = now;
      this.hopUntil = now + TUNING.skills.hurdleHop;
      this.stats.hops++;
    }

    // Mass: STR resist + ult buffs.
    let mass = this.baseMass();
    if (charging) mass *= U.str.massMul;
    if (dashing) mass *= U.spd.massMul;
    if (iron) mass *= U.sta.massMul;
    setMass(b, mass);

    // ---- Stick → desired direction (with gap aim assist).
    let mag = Math.min(1, input.mag);
    if (mag < P.deadzone) mag = 0;
    let dx = input.x;
    let dz = -input.z;
    const len = Math.hypot(dx, dz);
    if (len > 1e-4) {
      dx /= len;
      dz /= len;
    } else {
      mag = 0;
    }
    if (this.stunT > 0) mag *= 0.25;
    if (mag > 0) {
      const strength = Math.min(1, P.aim.base + this.mods.gapSense * P.aim.perGapSense);
      const [ax, az] = this.assistDir(b.x, b.z, dx, dz, strength, world);
      const s = 1 - Math.exp(-P.aim.smooth * dt);
      this.aimX += (ax - this.aimX) * s;
      this.aimZ += (az - this.aimZ) * s;
      const al = Math.hypot(this.aimX, this.aimZ) || 1;
      this.aimX /= al;
      this.aimZ /= al;
      this.faceX = this.aimX;
      this.faceZ = this.aimZ;
    }
    this.moving = mag;

    // ---- Speed / drive.
    const auraR = Math.min(1, this.mods.auraResist + (iron ? U.sta.auraResist : 0));
    // STA 40 Hold Breath: stench aura has no effect.
    const slow = this.mods.holdBreath || now < this.mintUntil ? 0 : crowd.auraSlowAt(b.x, b.z) * (1 - auraR);
    this.drag = this.crowdDrag(world, crowd, dashing || leaping);
    // Squatting neighbours add lateral weave friction (harder to slip past) — not while leaping over them.
    const iceGlide = !!(this.mods as SkillModifiers & Partial<PlayerMods>).iceGlide;
    if (!leaping && !iceGlide) this.drag = Math.min(0.85, this.drag + crowd.squatLateralDrag(b.x, b.z, this.aimX, this.aimZ));
    const St = P.stamina;
    const clear = b.contacts === 0 && b.pressure < 0.002;
    const pm = this.mods as SkillModifiers & Partial<PlayerMods>;
    const charSpeed = pm.speedMul ?? 1;
    let maxV = P.maxSpeed * this.mods.moveSpeed * charSpeed * (clear ? this.mods.clearSpeed : 1) * (1 - slow) * (1 - this.drag);
    if (charging) maxV *= 1.3;
    if (dashing) maxV *= U.spd.speedMul * (this.blinkSpeedMul > 1 ? this.blinkSpeedMul / U.spd.speedMul : 1);
    // Burning Urgency: last 5 s of door timer — set by Sim via flag on player.
    if (this.burningUrgencyActive) maxV *= 1.1;
    if (now < this.espressoUntil) maxV *= 1.2;
    // Hurdle: clearing a suitcase costs a little pace (no block, but not free).
    if (now < this.hopUntil) maxV *= pm.techHurdlePace ?? TUNING.skills.hurdleHopSpeed;
    if (this.winded) maxV *= St.windedSpeedMul;

    let fx: number;
    let fz: number;
    if (mag > 0) {
      const vdx = this.aimX * maxV * mag;
      const vdz = this.aimZ * maxV * mag;
      fx = (vdx - b.vx) * P.accel * mass;
      fz = (vdz - b.vz) * P.accel * mass;
    } else {
      fx = -b.vx * P.brake * mass;
      fz = -b.vz * P.brake * mass;
    }
    let cap = P.maxDrive * this.mods.pushForce * (pm.pushMul ?? 1) * mass;
    if (charging) cap *= U.str.driveMul;
    if (this.winded) cap *= St.windedDriveMul;
    const fm = Math.hypot(fx, fz);
    if (fm > cap) {
      fx *= cap / fm;
      fz *= cap / fm;
    }

    // ---- Shouldering: slide along whoever blocks you instead of sticking head-on.
    const inContact = b.contacts > 0 && b.pressure > 0.005;
    if (this.mods.frontPush > 0 && inContact && this.aimX * b.cnx + this.aimZ * b.cnz < -0.2) {
      const boost = 1 + this.mods.frontPush;
      fx *= boost;
      fz *= boost;
      const fm2 = Math.hypot(fx, fz);
      if (fm2 > cap * boost) {
        fx *= (cap * boost) / fm2;
        fz *= (cap * boost) / fm2;
      }
    }
    if (mag > 0.2 && inContact) {
      const cl = Math.hypot(b.cnx, b.cnz);
      if (cl > 1e-4) {
        const nx = b.cnx / cl;
        const nz = b.cnz / cl;
        const dot = this.aimX * nx + this.aimZ * nz;
        if (dot < 0) {
          let tx = this.aimX - dot * nx;
          let tz = this.aimZ - dot * nz;
          const tl = Math.hypot(tx, tz);
          if (tl > 1e-3) {
            tx /= tl;
            tz /= tl;
            const k = P.slip * (1 + this.mods.gapSense * 2) * cap * -dot * mag;
            fx += tx * k;
            fz += tz * k;
          }
        }
      }
    }
    // Turn sideways in a squeeze (smaller footprint), relax when free.
    const targetR = mag > 0.5 && inContact ? P.shoulderRadius : P.radius;
    b.r += (targetR - b.r) * (1 - Math.exp(-10 * dt));
    if (dashing) b.r = Math.min(b.r, P.shoulderRadius);

    b.fx += fx;
    b.fz += fz;

    // ---- Stamina.
    this.pushing = mag > 0.2 && inContact;
    const regenMul = iron ? U.sta.regenMul : 1;
    const stam0 = this.stamina;
    if (this.winded) {
      this.stamina += this.mods.staminaRegen * regenMul * dt * (mag < 0.2 ? 1 : St.windedRegen);
    } else if (this.pushing && !dashing) {
      // STA 60 Unbothered: the share of contacts that are family members costs nothing.
      const famCut = this.mods.unbothered ? this.familyContactFrac(world, crowd) : 0;
      const drain =
        ((St.drainBase + b.pressure * St.drainPerPressure) * mag) /
        (1 + this.mods.resist) *
        (1 - famCut);
      this.stats.pushDrain += drain * dt;
      this.stamina += (this.mods.staminaRegen * regenMul * St.pushRegen - drain) * dt;
    } else {
      this.stamina += this.mods.staminaRegen * regenMul * dt * (mag < 0.2 ? 1 : 0.55);
    }
    // Regen never lifts stamina above the cap (or above an existing STA buffer) — previously idle regen
    // out-ran the buffer bleed and stamina crept past max indefinitely.
    const regenCap = Math.max(this.staminaMax, stam0);
    if (this.stamina > regenCap) this.stamina = regenCap;
    // 大聲公 Loudmouth noise zone: continuous drain + halved regen (STA 60 Unbothered cuts it ~70%).
    const noise = crowd.noiseAt(b.x, b.z);
    if (noise > 0) {
      const Ld = TUNING.types.loud;
      let mul = this.mods.unbothered ? TUNING.skills.unbotheredLoudMul : 1;
      if (!this.mods.unbothered && pm.techLoudCut) mul = 1 - pm.techLoudCut;
      if (now < this.mintUntil) mul *= 0.5;
      this.noiseDrain = noise * Ld.drainPeak * mul;
      // Undo part of this step's regen (regen was added above), then drain.
      const regenBack = this.mods.staminaRegen * regenMul * (1 - Ld.regenMul) * mul;
      const loss = (this.noiseDrain + (this.winded ? 0 : regenBack)) * dt;
      this.stamina -= loss;
      this.stats.loudDrain += this.noiseDrain * dt;
    } else {
      this.noiseDrain = 0;
    }
    // ---- v0.8 Mana (mage only).
    if (this.manaMax > 0) {
      const mpm = this.mods as SkillModifiers & Partial<PlayerMods>;
      let mRegen = (mpm.manaRegen ?? 0);
      if (now < this.manaRegenBurstUntil) mRegen *= this.manaRegenBurstMul;
      if (this.burningUrgencyActive) mRegen *= 2;
      if (noise > 0) mRegen *= TUNING.mage.manaNoiseMul;
      // Dropped Call passive: noise drain −30 % (on top of unbothered path above for stamina).
      if (mpm.droppedCall && noise > 0) {
        /* mana already halved by manaNoiseMul; stamina noise uses unbothered or full */
      }
      this.mana = Math.min(this.manaMax, this.mana + mRegen * dt);
    }
    // Non-regen buffer (above max) slowly bleeds to the regen cap unless in Iron Stance.
    if (this.stamina > this.staminaMax) {
      if (!iron) this.stamina = Math.max(this.staminaMax, this.stamina - this.mods.staminaRegen * 0.25 * dt);
    } else {
      this.stamina = Math.min(this.staminaMax, this.stamina);
    }
    if (this.stamina <= 0) {
      this.stamina = 0;
      if (!this.winded) {
        this.winded = true;
        emit({ t: 'winded' });
      }
    } else if (this.winded && this.stamina >= this.staminaMax * St.recoverFrac) {
      this.winded = false;
    }

    // Hold-to-shove is the office worker's exit. Mage casts; Gear L uses kit.
    const S = P.shove;
    const canPush = (this.mods as { characterId?: string }).characterId !== 'mage'
      && (this.mods as { characterId?: string }).characterId !== 'tech';
    if (!canPush) {
      this.shoveCharge = 0;
      this.shoveWasHeld = false;
    } else if (input.shoveHeld) {
      this.shoveCharge = Math.min(1, this.shoveCharge + dt / S.chargeTime);
      this.shoveWasHeld = true;
    } else if (this.shoveWasHeld) {
      this.tryShove(0.45 + 0.55 * this.shoveCharge, world, crowd, emit);
      this.shoveCharge = 0;
      this.shoveWasHeld = false;
    } else {
      this.shoveCharge = 0;
      this.shoveWasHeld = false;
    }

    if (this.path.length) this.path = [];
  }

  /**
   * Shuffling through a packed crowd is slow: each nearby body (weighted by
   * closeness) shaves a little off top speed, up to `max`. WIS slips through
   * better; the SPD dash mostly ignores it.
   */
  private crowdDrag(world: World, crowd: CrowdSim, dashing: boolean): number {
    const D = TUNING.player.crowdDrag;
    if (D.perBody <= 0) return 0;
    const b = this.body;
    let n = 0;
    for (const o of world.query(b.x, b.z, D.radius, this.tmp)) {
      if (o === b) continue;
      if (b.passMask & o.passTag) continue; // hurdled / leapt bodies don't slow you
      if (this.mods.unbothered && crowd.byBody.get(o.id)?.kind === 'family') continue;
      const d = Math.hypot(o.x - b.x, o.z - b.z);
      if (d < D.radius) n += 1 - d / D.radius;
    }
    let drag = Math.min(D.max, n * D.perBody) * (1 - Math.min(1, this.mods.gapSense * D.perGapSense));
    drag *= 1 - this.mods.blockedDragCut;
    if (dashing) drag *= D.dashMul;
    return drag;
  }

  /** Is the player currently overlapping any body with this pass tag? */
  private overlapsTag(world: World, tag: number): boolean {
    const b = this.body;
    for (const o of world.query(b.x, b.z, b.r + 0.05, this.tmp)) {
      if (o === b || !(o.passTag & tag)) continue;
      if (Math.hypot(o.x - b.x, o.z - b.z) < o.r + b.r + 0.04) return true;
    }
    return false;
  }

  /** Fraction (0–1) of bodies touching the player that are family members. */
  private familyContactFrac(world: World, crowd: CrowdSim): number {
    const b = this.body;
    let all = 0;
    let fam = 0;
    for (const o of world.query(b.x, b.z, b.r + 0.35, this.tmp)) {
      if (o === b || (b.passMask & o.passTag)) continue;
      if (Math.hypot(o.x - b.x, o.z - b.z) > o.r + b.r + 0.03) continue;
      all++;
      if (crowd.byBody.get(o.id)?.kind === 'family') fam++;
    }
    return all ? fam / all : 0;
  }

  private tryShove(power: number, world: World, crowd: CrowdSim, emit: Emit): boolean {
    const S = TUNING.player.shove;
    if (this.shoveCd > 0) return false;
    const cost = S.minCost + (S.maxCost - S.minCost) * power;
    if (this.stamina < cost * 0.5) return false;
    this.stamina = Math.max(0, this.stamina - cost);
    this.shoveCd = S.cooldown;
    const b = this.body;
    const dx = this.faceX;
    const dz = this.faceZ;
    applyImpulse(b, dx * S.lunge * power * b.mass, dz * S.lunge * power * b.mass);
    const chargeMul =
      this.mods.hasChargedShove && power > 0.85 ? this.mods.chargeShoveMul : 1;
    const cone = TUNING.player.shove.coneCos;
    const near = world.query(b.x, b.z, S.range, this.tmp);
    let hits = 0;
    for (const o of near) {
      if (o === b) continue;
      const rx = o.x - b.x;
      const rz = o.z - b.z;
      const d = Math.hypot(rx, rz) || 1e-6;
      const along = (rx * dx + rz * dz) / d;
      if (along < cone) continue;
      const fall = Math.max(0, 1 - Math.max(0, d - b.r - o.r) / S.range);
      let typeMul = 1;
      const ag0 = crowd.byBody.get(o.id);
      if (ag0 && PASSENGER_DEFS[ag0.kind].hardToShove) typeMul = TUNING.types.squat.shoveMul;
      const J =
        S.impulse *
        power *
        this.mods.pushForce *
        chargeMul *
        typeMul *
        (0.35 + 0.65 * fall);
      let nx = (rx / d) * 0.6 + dx * 0.4;
      let nz = (rz / d) * 0.6 + dz * 0.4;
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl;
      nz /= nl;
      applyImpulse(o, nx * J, nz * J);
      applyImpulse(b, -dx * J * 0.12, -dz * J * 0.12);
      hits++;
      const ag = ag0;
      if (ag) {
        ag.bumpAcc = Math.max(ag.bumpAcc, 0.6 + power * 0.4);
        crowd.annoy(ag);
        if (ag.boss) crowd.hitBoss(ag, power * this.mods.pushForce * chargeMul * typeMul);
        // STR 40 Split: break the couple's hand-hold.
        if (this.mods.splitCouples && ag.partner && crowd.splitCouple(ag)) this.stats.splits++;
        emit({ t: 'shoveHit', x: o.x, z: o.z, power, agentId: ag.id });
      }
    }
    // STR T3b Ground Pound: full-charge adds a small radial shockwave.
    if (this.mods.hasGroundPound && power > 0.95) {
      const K = TUNING.skills;
      const pmGp = this.mods as SkillModifiers & Partial<PlayerMods>;
      const gpR = pmGp.techGpRadius ?? K.groundPoundRadius;
      const gpLug = pmGp.techGpLuggage ?? K.groundPoundLuggageMul;
      for (const o of world.query(b.x, b.z, gpR, this.tmp)) {
        if (o === b) continue;
        const rx = o.x - b.x;
        const rz = o.z - b.z;
        const d = Math.hypot(rx, rz) || 1e-6;
        const fall = Math.max(0, 1 - d / gpR);
        // Heavy luggage (owner + suitcase) gets a proportionally bigger kick so it actually moves.
        const J = K.groundPoundImpulse * fall * (o.passTag & PASS_LUGGAGE ? gpLug : 1);
        applyImpulse(o, (rx / d) * J, (rz / d) * J);
      }
    }
    emit({ t: 'shove', x: b.x, z: b.z, dx, dz, power, hits });
    return true;
  }

  activateUltimate(kind: UltKind, now: number, world: World, crowd: CrowdSim, emit: Emit): boolean {
    const U = TUNING.ult;
    if (this.ultCd[kind] > 0) return false;
    const b = this.body;
    const pmUlt = this.mods as SkillModifiers & Partial<PlayerMods>;
    this.ultCd[kind] = pmUlt.techUltCd ?? U.cooldown;
    if (kind === 'str') {
      this.chargeUntil = now + U.str.duration;
      const near = world.query(b.x, b.z, U.str.radius, this.tmp);
      for (const o of near) {
        if (o === b) continue;
        const rx = o.x - b.x;
        const rz = o.z - b.z;
        const d = Math.hypot(rx, rz) || 1e-6;
        const fall = Math.pow(Math.max(0, 1 - d / U.str.radius), 0.7);
        const J = U.str.impulse * fall;
        applyImpulse(o, (rx / d) * J, (rz / d) * J);
        const ag = crowd.byBody.get(o.id);
        if (ag) {
          ag.bumpAcc = 1;
          if (ag.windup >= 0) ag.windup = -1;
        }
      }
    } else if (kind === 'spd') {
      this.dashUntil = now + U.spd.duration;
      let dx = this.faceX;
      let dz = this.faceZ;
      if (this.moving < 0.1) {
        // No stick: dash toward the nearest open side door (−X).
        dx = doorWallX() - b.x;
        dz = this.targetDoorZ - b.z;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l;
        dz /= l;
      }
      this.aimX = this.faceX = dx;
      this.aimZ = this.faceZ = dz;
      b.vx = dx * U.spd.burst;
      b.vz = dz * U.spd.burst;
    } else {
      // STA Iron Stance: heavy footing + burst regen (no path highlight).
      this.ironUntil = now + U.sta.duration;
      this.winded = false;
      this.stamina = Math.min(this.staminaMax, this.stamina + this.staminaMax * 0.35);
      this.path = [];
    }
    emit({ t: 'ult', kind, x: b.x, z: b.z, dx: this.faceX, dz: this.faceZ });
    return true;
  }

  /** Spend mana + start cooldown for a spell id. Returns false if denied. */
  beginSpell(id: string, cost: number, cd: number): boolean {
    if ((this.spellCd[id] ?? 0) > 0) return false;
    if (this.mana < cost) {
      this.manaDeniedT = 0.45;
      return false;
    }
    this.mana -= cost;
    this.spellCd[id] = cd;
    return true;
  }

  /** SPD 50 飛身 Leap (active): short burst; airborne over squatters + family kids. */
  tryLeap(now: number): boolean {
    if (!this.mods.hasLeap || this.activeCd.leap > 0) return false;
    const K = TUNING.skills;
    const pmLeap = this.mods as SkillModifiers & Partial<PlayerMods>;
    this.activeCd.leap = pmLeap.techLeapCd ?? K.leapCd;
    this.leapStart = now;
    this.leapUntil = now + K.leapDuration;
    this.body.passMask |= PASS_SQUAT | PASS_KID;
    let dx = this.faceX;
    let dz = this.faceZ;
    if (this.moving < 0.1) {
      dx = doorWallX() - this.body.x;
      dz = this.targetDoorZ - this.body.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
    }
    this.aimX = this.faceX = dx;
    this.aimZ = this.faceZ = dz;
    this.body.vx = dx * K.leapBurst;
    this.body.vz = dz * K.leapBurst;
    this.stats.leaps++;
    return true;
  }

  /** STA 50 回魂 Second Wind (active): stamina burst + knock nearby brats away (dazed). */
  trySecondWind(crowd?: CrowdSim): boolean {
    if (!this.mods.hasSecondWind || this.activeCd.wind > 0) return false;
    const K = TUNING.skills;
    this.activeCd.wind = K.secondWindCd;
    this.winded = false;
    this.stamina = Math.min(this.staminaMax, this.stamina + K.secondWindAmount);
    if (crowd) this.stats.shakeOffs += crowd.shakeOffBrats(this.body.x, this.body.z);
    return true;
  }

  /**
   * Fan of probe rays around the wanted direction; each is penalised by the
   * bodies (weighted by mass) and walls in its corridor. Blends toward the
   * clearest one by `strength`.
   */
  assistDir(x: number, z: number, dx: number, dz: number, strength: number, world: World): [number, number] {
    if (strength <= 0.001) return [dx, dz];
    const A = TUNING.player.aim;
    const rad = TUNING.player.radius;
    const near = world.query(x, z, A.probe, this.tmp);
    let bestScore = -Infinity;
    let bx = dx;
    let bz = dz;
    let centreScore = 0;
    const n = A.rays;
    for (let i = 0; i < n; i++) {
      const ang = -A.fan + (2 * A.fan * i) / (n - 1);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const cx = dx * c - dz * s;
      const cz = dx * s + dz * c;
      let cost = 0;
      for (const o of near) {
        if (o === this.body || (this.body.passMask & o.passTag)) continue;
        const rx = o.x - x;
        const rz = o.z - z;
        const along = rx * cx + rz * cz;
        if (along <= 0 || along > A.probe) continue;
        const lat = Math.abs(rx * cz - rz * cx);
        const clear = o.r + rad + 0.06;
        if (lat < clear) cost += (1 - lat / clear) * (1 - (along / A.probe) * 0.6) * Math.sqrt(o.mass);
      }
      for (let k = 1; k <= 3; k++) {
        const t = (A.probe * k) / 3.5;
        if (world.overlapsStatic(x + cx * t, z + cz * t, rad * 0.8)) cost += 1.2 / k;
      }
      const score = -cost + c * 1.25 + -cz * 0.15;
      if (i === (n - 1) / 2) centreScore = score;
      if (score > bestScore) {
        bestScore = score;
        bx = cx;
        bz = cz;
      }
    }
    if (bestScore <= centreScore + 0.05) return [dx, dz];
    let rx = dx + (bx - dx) * strength;
    let rz = dz + (bz - dz) * strength;
    const l = Math.hypot(rx, rz) || 1;
    rx /= l;
    rz /= l;
    return [rx, rz];
  }

  /** Greedy gap-following path from the player to the nearest side door (WIS ultimate). */
  computePath(world: World): PathPoint[] {
    const C = TUNING.car;
    const wall = doorWallX();
    const bay = this.targetDoorZ;
    const pts: PathPoint[] = [];
    let x = this.body.x;
    let z = this.body.z;
    for (let i = 0; i < 18; i++) {
      let dx = wall + 0.2 - x;
      let dz = bay - z;
      const l = Math.hypot(dx, dz);
      if (l < 0.3) break;
      dx /= l;
      dz /= l;
      const [ax, az] = this.assistDir(x, z, dx, dz, 1, world);
      x += ax * 0.42;
      z += az * 0.42;
      x = Math.max(-C.halfWidth + 0.15, Math.min(C.halfWidth - 0.3, x));
      z = Math.max(C.zMin + 0.3, Math.min(C.zMax - 0.3, z));
      pts.push({ x, z });
      if (x <= wall + C.winDepth && Math.abs(z - bay) < C.winHalf) break;
    }
    return pts;
  }
}
