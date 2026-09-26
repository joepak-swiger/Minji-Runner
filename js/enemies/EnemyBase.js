export default class EnemyBase {
  constructor({
    container,
    groundHeight,
    getViewportWidth,
    type,
    className,
    width,
    height,
    spawnOffset = 20,
    hitboxInsetX = 6,
    hitboxInsetY = 6,
  }) {
    if (!container) throw new Error(`${type}: container is required.`);
    if (typeof groundHeight !== 'number') throw new Error(`${type}: groundHeight is required.`);
    if (typeof getViewportWidth !== 'function') throw new Error(`${type}: getViewportWidth is required.`);

    this.container = container;
    this.groundHeight = groundHeight;
    this.getViewportWidth = getViewportWidth;
    this.type = type;
    this.className = className;
    this.w = width;
    this.h = height;
    this.x = this.getViewportWidth() + this.w + spawnOffset;
    this.y = 0;
    this.insetX = hitboxInsetX;
    this.insetY = hitboxInsetY;
    this.scored = false;
    this.dead = false;
    this.isFlying = false;
    this._ride = null;

    this.el = document.createElement('div');
    this.el.className = `enemy ${className}`;
    this.el.dataset.enemyType = type;
    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${this.h}px`;
    this.container.appendChild(this.el);
    this.place();
  }

  setGroundHeight(groundHeight) {
    if (typeof groundHeight !== 'number' || !Number.isFinite(groundHeight)) return;
    this.groundHeight = groundHeight;
    this.place();
  }

  bounds() {
    return {
      left: this.x + this.insetX,
      right: this.x + this.w - this.insetX,
      bottom: this.groundHeight + this.y + this.insetY,
      top: this.groundHeight + this.y + this.h - this.insetY,
    };
  }

  hasPassedX(playerX) {
    return this.x + this.w < playerX;
  }

  isOffscreenLeft() {
    return this.x + this.w <= -28;
  }

  place() {
    this.el.style.left = `${this.x}px`;
    this.el.style.bottom = `${this.groundHeight + this.y}px`;
  }

  remove() {
    if (this.dead) return;
    this.dead = true;
    this.el.remove();
  }
}
