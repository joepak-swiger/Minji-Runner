export default class Minji {
  constructor({ el, groundHeight, config }) {
    if (!el) throw new Error('Minji: player element is required.');
    if (typeof groundHeight !== 'number') throw new Error('Minji: ground height is required.');

    this.el = el;
    this.groundHeight = groundHeight;
    this.config = config;

    this.w = config.width;
    this.h = config.height;
    this.x = config.startX;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;
    this.invulnerable = false;
    this.shielded = false;
    this.movementEffect = 'normal';
    this.movementSpeedMultiplier = 1;
    this.jumpedThisFrame = false;

    this.coyoteTimer = config.coyoteTime;
    this.jumpBufferTimer = 0;
    this.wasJumpHeld = false;

    this.animTime = 0;
    this.animFrame = 0;
    this.idleSprite = 'assets/player/minji.png';
    this.walkSprites = [
      'assets/player/walk_1.png',
      'assets/player/walk_2.png',
      'assets/player/walk_3.png',
      'assets/player/walk_4.png',
    ];

    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${this.h}px`;
    this.el.style.backgroundImage = `url("${this.idleSprite}")`;
    this.setPosition();
  }

  reset(viewportWidth) {
    this.x = Math.min(this.config.startX, Math.max(0, viewportWidth - this.w));
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;
    this.invulnerable = false;
    this.shielded = false;
    this.movementEffect = 'normal';
    this.movementSpeedMultiplier = 1;
    this.jumpedThisFrame = false;
    this.coyoteTimer = this.config.coyoteTime;
    this.jumpBufferTimer = 0;
    this.wasJumpHeld = false;
    this.animTime = 0;
    this.animFrame = 0;
    this.el.classList.remove(
      'hit',
      'shield-hit',
      'invulnerable',
      'shielded',
      'speed-boosted',
      'slowed',
    );
    this.el.style.backgroundImage = `url("${this.idleSprite}")`;
    this.setPosition();
  }

  update(dt, input, viewportWidth) {
    const cfg = this.config;
    this.jumpedThisFrame = false;

    let direction = 0;
    if (input.left) direction -= 1;
    if (input.right) direction += 1;

    if (direction !== 0) this.facing = direction;

    const speedMultiplier = Math.max(0.1, this.movementSpeedMultiplier);
    const desiredVelocity = direction * cfg.maxRunSpeed * speedMultiplier;
    const baseAcceleration = Math.abs(desiredVelocity) > Math.abs(this.vx)
      ? cfg.acceleration
      : cfg.deceleration;

    // Coffee should feel snappier while junk food should feel genuinely heavy.
    // Horizontal movement changes, but jump height stays consistent so a bad
    // pickup never makes a previously reachable platform physically impossible.
    const responseMultiplier = speedMultiplier >= 1
      ? Math.min(1.25, speedMultiplier)
      : Math.max(0.68, speedMultiplier);
    this.vx = approach(this.vx, desiredVelocity, baseAcceleration * responseMultiplier * dt);

    if (input.jumpPressed) this.jumpBufferTimer = cfg.jumpBuffer;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    if (this.onGround) {
      this.coyoteTimer = cfg.coyoteTime;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    if (this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.vy = cfg.jumpVelocity;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpedThisFrame = true;
    }

    if (this.wasJumpHeld && !input.jumpHeld && this.vy > 0) {
      this.vy *= cfg.jumpCutMultiplier;
    }
    this.wasJumpHeld = input.jumpHeld;

    const gravityMultiplier = input.down && !this.onGround && this.vy < 0 ? 1.45 : 1;
    this.vy -= cfg.gravity * gravityMultiplier * dt;
    if (this.vy < -cfg.maxFallSpeed) this.vy = -cfg.maxFallSpeed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y <= 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    const maxX = Math.max(0, viewportWidth - this.w);
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    if (this.x > maxX) {
      this.x = maxX;
      this.vx = 0;
    }

    this._updateAnimation(dt, direction !== 0 && this.onGround);
    this.setPosition();
  }

  landOn(worldTop) {
    this.y = Math.max(0, worldTop - this.groundHeight);
    this.vy = 0;
    this.onGround = true;
    this.coyoteTimer = this.config.coyoteTime;
    this.setPosition();
  }

  setGroundHeight(groundHeight) {
    if (typeof groundHeight !== 'number' || !Number.isFinite(groundHeight)) return;
    this.groundHeight = groundHeight;
    this.setPosition();
  }

  setInvulnerable(active) {
    this.invulnerable = Boolean(active);
    this.el.classList.toggle('invulnerable', this.invulnerable);
  }

  setShielded(active) {
    this.shielded = Boolean(active);
    if (this.shielded) this.el.classList.remove('shield-hit');
    this.el.classList.toggle('shielded', this.shielded);
  }

  setMovementEffect(effect = 'normal', speedMultiplier = 1) {
    const safeEffect = ['normal', 'speed', 'slow'].includes(effect) ? effect : 'normal';
    const safeMultiplier = Number.isFinite(speedMultiplier)
      ? Math.max(0.1, speedMultiplier)
      : 1;

    this.movementEffect = safeEffect;
    this.movementSpeedMultiplier = safeEffect === 'normal' ? 1 : safeMultiplier;

    this.el.classList.toggle('speed-boosted', safeEffect === 'speed');
    this.el.classList.toggle('slowed', safeEffect === 'slow');

    // Prevent a stale velocity from temporarily exceeding a newly lowered cap.
    const maxSpeed = this.config.maxRunSpeed * this.movementSpeedMultiplier;
    if (Math.abs(this.vx) > maxSpeed) {
      this.vx = Math.sign(this.vx || 1) * maxSpeed;
    }
  }

  bounds() {
    const { hitboxInsetX, hitboxInsetY } = this.config;
    return {
      left: this.x + hitboxInsetX,
      right: this.x + this.w - hitboxInsetX,
      bottom: this.groundHeight + this.y + hitboxInsetY,
      top: this.groundHeight + this.y + this.h - hitboxInsetY,
    };
  }

  setPosition() {
    const renderFootOffset = this.config.renderFootOffsetPx ?? 0;
    const sourceFacesRight = this.config.spriteFacesRightByDefault !== false;
    const shouldFlip = sourceFacesRight ? this.facing < 0 : this.facing > 0;

    this.el.style.left = `${this.x}px`;
    this.el.style.bottom = `${this.groundHeight + this.y - renderFootOffset}px`;
    this.el.style.transform = shouldFlip ? 'scaleX(-1)' : 'scaleX(1)';
  }

  flashHit() {
    this.el.classList.remove('hit');
    void this.el.offsetWidth;
    this.el.classList.add('hit');
  }

  flashShieldHit() {
    this.el.classList.remove('shield-hit');
    void this.el.offsetWidth;
    this.el.classList.add('shield-hit');
  }

  _updateAnimation(dt, walking) {
    if (!walking) {
      this.animTime = 0;
      this.animFrame = 0;
      this.el.style.backgroundImage = `url("${this.idleSprite}")`;
      return;
    }

    this.animTime += dt;
    const frameDuration = 1 / this.config.walkFps;
    while (this.animTime >= frameDuration) {
      this.animTime -= frameDuration;
      this.animFrame = (this.animFrame + 1) % this.walkSprites.length;
    }
    this.el.style.backgroundImage = `url("${this.walkSprites[this.animFrame]}")`;
  }
}

function approach(current, target, amount) {
  if (current < target) return Math.min(current + amount, target);
  if (current > target) return Math.max(current - amount, target);
  return target;
}
