import EnemyBase from './EnemyBase.js';

const TAU = Math.PI * 2;

export default class Hoverbat extends EnemyBase {
  constructor(options) {
    super({
      ...options,
      type: 'hoverbat',
      className: 'joe-llama',
      width: 60,
      height: 94,
      hitboxInsetX: 9,
      hitboxInsetY: 10,
    });

    this.isFlying = true;
    this.getViewportHeight = options.getViewportHeight;
    this.speed = randomInt(options.speedMin ?? 235, options.speedMax ?? 345);
    this.altitude = options.altitude ?? 150;
    this.amplitude = options.amplitude ?? 62;
    this.frequencyHz = options.frequencyHz ?? 1.0;
    this.phase = Math.random() * TAU;
    this.y = this.altitude + Math.sin(this.phase) * this.amplitude;
    this.place();
  }

  update(dt) {
    if (this.dead) return;
    this.x -= this.speed * dt;
    this.phase = (this.phase + this.frequencyHz * TAU * dt) % TAU;

    let targetY = this.altitude + Math.sin(this.phase) * this.amplitude;
    targetY = Math.max(18, targetY);

    if (typeof this.getViewportHeight === 'function') {
      const maxY = Math.max(18, this.getViewportHeight() - this.groundHeight - this.h - 18);
      targetY = Math.min(targetY, maxY);
    }

    this.y = targetY;
    this.place();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
