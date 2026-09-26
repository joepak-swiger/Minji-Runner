import EnemyBase from './EnemyBase.js';

export default class Jumper extends EnemyBase {
  constructor(options) {
    super({
      ...options,
      type: 'jumper',
      className: 'joe-gremlin',
      width: 54,
      height: 92,
      hitboxInsetX: 8,
      hitboxInsetY: 7,
    });

    this.speed = randomInt(options.speedMin ?? 215, options.speedMax ?? 310);
    this.gravity = options.gravity ?? 1850;
    this.hopVelocity = options.hopVelocity ?? 720;
    this.hopIntervalMin = options.hopIntervalMin ?? 0.75;
    this.hopIntervalMax = options.hopIntervalMax ?? 1.35;
    this.vy = 0;
    this.onGround = true;
    this.hopTimer = randomFloat(this.hopIntervalMin, this.hopIntervalMax);
  }

  update(dt) {
    if (this.dead) return;
    this.x -= this.speed * dt;

    if (this.onGround) {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) {
        this.vy = this.hopVelocity;
        this.onGround = false;
        this.hopTimer = randomFloat(this.hopIntervalMin, this.hopIntervalMax);
      }
    }

    this.vy -= this.gravity * dt;
    this.y += this.vy * dt;

    if (this.y <= 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
      this.onGround = true;
    }

    this.place();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
