const PLATFORM_ASSETS = Object.freeze({
  brick: 'assets/platforms/brick.png',
  tuft: 'assets/platforms/tuft.png',
  leaf: 'assets/platforms/leaf.png',
  cloud: 'assets/platforms/cloud.png',
});

const PLATFORM_SKINS = Object.freeze({
  // The active PNGs are trimmed to their visible alpha bounds. These display
  // dimensions preserve each trimmed sprite's aspect ratio closely, so the
  // artwork, DOM rectangle, and collision surface finally agree.
  brick: Object.freeze({ w: 220, h: 71, insetX: 18 }),
  tuft: Object.freeze({ w: 200, h: 72, insetX: 16 }),
  leaf: Object.freeze({ w: 170, h: 58, insetX: 14 }),
  cloud: Object.freeze({ w: 260, h: 85, insetX: 20 }),
});

export default class Platform {
  constructor({
    container,
    groundHeight,
    getViewportWidth,
    skin = 'leaf',
    width,
    height,
    speedPx = 218,
    speedMultiplier = 1,
    topY,
    spawnOffsetX = 48,
    surfaceThickness = 12,
    hitboxInsetX,
    maxStepUpPx,
    currentSurfaceTopY,
  } = {}) {
    if (!container) throw new Error('Platform: container is required.');
    if (typeof groundHeight !== 'number') throw new Error('Platform: groundHeight is required.');
    if (typeof getViewportWidth !== 'function') throw new Error('Platform: getViewportWidth is required.');

    this.container = container;
    this.groundHeight = groundHeight;
    this.getViewportWidth = getViewportWidth;
    this.skin = skin;

    const skinConfig = PLATFORM_SKINS[this.skin] ?? PLATFORM_SKINS.leaf;
    this.w = width ?? skinConfig.w;
    this.h = height ?? skinConfig.h;

    this.vx = -speedPx * speedMultiplier;
    this.x = this.getViewportWidth() + spawnOffsetX;

    const band = getSpawnBandForSkin(this.skin, this.groundHeight);
    let chosenTopY = typeof topY === 'number' ? topY : randomFloat(band.minY, band.maxY);

    if (typeof maxStepUpPx === 'number' && typeof currentSurfaceTopY === 'number') {
      const capTop = currentSurfaceTopY + maxStepUpPx;
      const minimum = this.groundHeight + 54;
      chosenTopY = clamp(chosenTopY, minimum, capTop);
    }

    // y is stored as the platform bottom above the live ground line. Because
    // the active platform artwork has no giant transparent border, worldTop()
    // is now the same top edge the player sees on screen.
    this.y = Math.max(0, chosenTopY - this.h - this.groundHeight);
    this.surfaceThickness = surfaceThickness;
    this.insetX = typeof hitboxInsetX === 'number' ? hitboxInsetX : skinConfig.insetX;
    this._removed = false;

    this.el = document.createElement('div');
    this.el.className = `platform platform-${this.skin}`;
    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${this.h}px`;
    this.el.style.backgroundImage = `url("${PLATFORM_ASSETS[this.skin] ?? PLATFORM_ASSETS.leaf}")`;
    this.container.appendChild(this.el);
    this.place();
  }

  update(dt) {
    this.x += this.vx * dt;
    this.place();
  }

  setGroundHeight(groundHeight) {
    if (typeof groundHeight !== 'number' || !Number.isFinite(groundHeight)) return;
    this.groundHeight = groundHeight;
    this.place();
  }

  bounds() {
    const top = this.worldTop();
    return {
      left: this.x + this.insetX,
      right: this.x + this.w - this.insetX,
      bottom: top - this.surfaceThickness,
      top,
    };
  }

  worldTop() {
    return this.groundHeight + this.y + this.h;
  }

  centerX() {
    return this.x + this.w * 0.5;
  }

  isOffscreenLeft() {
    return this.x + this.w < -48;
  }

  place() {
    this.el.style.left = `${this.x}px`;
    this.el.style.bottom = `${this.groundHeight + this.y}px`;
  }

  remove() {
    if (this._removed) return;
    this._removed = true;
    this.el.remove();
  }
}

function getSpawnBandForSkin(skin, groundTopY) {
  const offsets = {
    brick: [52, 70],
    tuft: [84, 116],
    leaf: [116, 150],
    cloud: [150, 206],
  }[skin] ?? [116, 150];

  return {
    minY: groundTopY + offsets[0],
    maxY: groundTopY + offsets[1],
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
