import EnemyBase from './EnemyBase.js';

export default class BullRush extends EnemyBase {
  constructor(options) {
    super({
      ...options,
      type: 'bullrush',
      className: 'miloctopus',
      width: 90,
      height: 78,
      hitboxInsetX: 10,
      hitboxInsetY: 8,
    });

    this.approachSpeed = options.approachSpeed ?? 170;
    this.triggerDistance = options.triggerDistance ?? 315;
    this.windupTime = options.windupTime ?? 0.48;
    this.chargeSpeed = options.chargeSpeed ?? 585;
    this.chargeMaxTime = options.chargeMaxTime ?? 1.05;
    this.recoverTime = options.recoverTime ?? 0.42;
    this.state = 'approach';
    this.timer = 0;
  }

  update(dt, playerX) {
    if (this.dead) return;

    if (this.state === 'approach') {
      this.x -= this.approachSpeed * dt;
      if (Math.abs(this.x - playerX) <= this.triggerDistance) {
        this.state = 'windup';
        this.timer = this.windupTime;
        this.el.classList.add('windup');
      }
    } else if (this.state === 'windup') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'charge';
        this.timer = this.chargeMaxTime;
        this.el.classList.remove('windup');
        this.el.classList.add('charge');
      }
    } else if (this.state === 'charge') {
      this.x -= this.chargeSpeed * dt;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'recover';
        this.timer = this.recoverTime;
        this.el.classList.remove('charge');
        this.el.classList.add('recover');
      }
    } else if (this.state === 'recover') {
      this.x -= this.approachSpeed * 0.6 * dt;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'approach';
        this.el.classList.remove('recover');
      }
    }

    this.place();
  }
}
