import Walker from './Walker.js';
import Jumper from './Jumper.js';
import Hoverbat from './Hoverbat.js';
import BullRush from './BullRush.js';

export const ENEMY_REGISTRY = Object.freeze({
  walker: Object.freeze({
    type: 'walker',
    label: 'Joe Goblin',
    shortLabel: 'Goblin',
    ctor: Walker,
  }),
  jumper: Object.freeze({
    type: 'jumper',
    label: 'Joe Gremlin',
    shortLabel: 'Gremlin',
    ctor: Jumper,
  }),
  hoverbat: Object.freeze({
    type: 'hoverbat',
    label: 'Llama Joe',
    shortLabel: 'Llama',
    ctor: Hoverbat,
  }),
  bullrush: Object.freeze({
    type: 'bullrush',
    label: 'Miloctopus',
    shortLabel: 'Milo',
    ctor: BullRush,
  }),
});

export function createEnemy(type, context, speedMultiplier = 1) {
  const entry = ENEMY_REGISTRY[type];
  if (!entry) throw new Error(`Unknown enemy type: ${type}`);

  const common = {
    container: context.container,
    groundHeight: context.groundHeight,
    getViewportWidth: context.getViewportWidth,
    getViewportHeight: context.getViewportHeight,
  };

  switch (type) {
    case 'walker':
      return new entry.ctor({
        ...common,
        speedMin: Math.round(215 * speedMultiplier),
        speedMax: Math.round(320 * speedMultiplier),
      });
    case 'jumper':
      return new entry.ctor({
        ...common,
        speedMin: Math.round(215 * speedMultiplier),
        speedMax: Math.round(310 * speedMultiplier),
        gravity: 1850,
        hopVelocity: Math.round(720 * Math.sqrt(speedMultiplier)),
        hopIntervalMin: 0.72,
        hopIntervalMax: 1.30,
      });
    case 'hoverbat':
      return new entry.ctor({
        ...common,
        speedMin: Math.round(235 * speedMultiplier),
        speedMax: Math.round(345 * speedMultiplier),
        altitude: 150,
        amplitude: 62,
        frequencyHz: 1.0 * speedMultiplier,
      });
    case 'bullrush':
      return new entry.ctor({
        ...common,
        approachSpeed: Math.round(170 * speedMultiplier),
        triggerDistance: 315,
        windupTime: 0.48 / Math.max(1, speedMultiplier * 0.92),
        chargeSpeed: Math.round(585 * speedMultiplier),
        chargeMaxTime: 1.05,
        recoverTime: 0.42,
      });
    default:
      throw new Error(`Unhandled enemy type: ${type}`);
  }
}
