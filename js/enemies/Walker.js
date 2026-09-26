import EnemyBase from './EnemyBase.js';

export default class Walker extends EnemyBase {
  constructor(options) {
    super({
      ...options,
      type: 'walker',
      className: 'joe-goblin',
      width: 58,
      height: 88,
      hitboxInsetX: 8,
      hitboxInsetY: 6,
    });
    this.speed = randomInt(options.speedMin ?? 215, options.speedMax ?? 320);
  }

  update(dt) {
    if (this.dead) return;
    this.x -= this.speed * dt;
    this.place();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
