import assert from 'node:assert/strict';

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) this.values.delete(name);
      else this.values.add(name);
      return this.values.has(name);
    }
    if (force) this.values.add(name);
    else this.values.delete(name);
    return force;
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.attributes = new Map();
    this.style = {
      setProperty(name, value) { this[name] = value; },
    };
    this.textContent = '';
    this.innerHTML = '';
    this.clientWidth = id === 'viewport' ? 960 : 0;
    this.clientHeight = id === 'viewport' ? 540 : 0;
    this.listeners = new Map();
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChildren(...children) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  setPointerCapture() {}
  closest() { return null; }
  get offsetWidth() { return 58; }
}

function fire(element, type, overrides = {}) {
  const handlers = [...(element.listeners.get(type) ?? [])];
  const event = {
    pointerId: 1,
    pointerType: 'mouse',
    repeat: false,
    code: '',
    target: element,
    preventDefault() {},
    ...overrides,
  };
  for (const handler of handlers) handler(event);
}

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.preload = 'none';
    this.volume = 1;
    this.muted = false;
    this.paused = true;
    this.currentTime = 0;
    this.playCount = 0;
    this.pauseCount = 0;
  }
  play() {
    this.paused = false;
    this.playCount += 1;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.pauseCount += 1;
  }
}

globalThis.Audio = FakeAudio;

const statusKeys = ['invulnerability', 'speed', 'shield', 'slow'];
const ids = [
  'game-root', 'viewport', 'background', 'entities', 'effects', 'player', 'overlay',
  'timer-value', 'score', 'best-score', 'stage-number', 'stage-name',
  'powerup-hud',
  ...statusKeys.flatMap((key) => [
    `status-${key}`,
    `status-${key}-icon`,
    `status-${key}-name`,
    `status-${key}-time`,
  ]),
  'btn-pause', 'btn-audio', 'start-screen', 'pause-screen', 'gameover-screen',
  'btn-start', 'btn-resume', 'btn-restart', 'btn-retry',
  'btn-left', 'btn-jump', 'btn-right',
  'final-time', 'final-score', 'final-stage', 'final-best',
];

const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
elements.get('powerup-hud').hidden = true;
for (const key of statusKeys) elements.get(`status-${key}`).hidden = true;

const fakeStorage = {
  values: new Map(),
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
  setItem(key, value) { this.values.set(key, String(value)); },
};

globalThis.document = {
  hidden: false,
  getElementById(id) { return elements.get(id) ?? null; },
  createElement() { return new FakeElement(); },
  addEventListener() {},
  removeEventListener() {},
  readyState: 'complete',
};

globalThis.window = {
  localStorage: fakeStorage,
  addEventListener() {},
  removeEventListener() {},
  setTimeout() { return 1; },
};

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.localStorage = fakeStorage;

const [
  { default: Game },
  { default: Platform },
  {
    default: FoodPickup,
    FOOD_ITEMS,
    FOOD_EFFECTS,
    applyFoodSpriteStyle,
  },
] = await Promise.all([
  import('../js/core/Game.js'),
  import('../js/platforms/Platform.js'),
  import('../js/powerups/FoodPickup.js'),
]);

assert.equal(FOOD_ITEMS.length, 25, 'food sheet should expose all 25 icons');
assert.deepEqual(
  Object.fromEntries(
    Object.values(FOOD_EFFECTS).map((effect) => [
      effect,
      FOOD_ITEMS.filter((item) => item.effect === effect).length,
    ]),
  ),
  {
    invulnerability: 6,
    slow: 10,
    shield: 8,
    speed: 1,
  },
  'food categories should match the v0.5+ design',
);

assert.equal(FOOD_ITEMS[0].name, 'Banana');
assert.equal(FOOD_ITEMS[0].effect, FOOD_EFFECTS.INVULNERABILITY);
assert.equal(FOOD_ITEMS[5].name, 'Cherries');
assert.equal(FOOD_ITEMS[8].name, 'Egg');
assert.equal(FOOD_ITEMS[8].effect, FOOD_EFFECTS.SHIELD);
assert.equal(FOOD_ITEMS[9].name, 'Cheese');
assert.equal(FOOD_ITEMS[10].name, 'Muffin');
assert.equal(FOOD_ITEMS[12].name, 'Coffee');
assert.equal(FOOD_ITEMS[12].effect, FOOD_EFFECTS.SPEED);
assert.equal(FOOD_ITEMS[14].name, 'Beer');
assert.equal(FOOD_ITEMS[14].effect, FOOD_EFFECTS.SLOW);
assert.equal(FOOD_ITEMS[22].name, 'Avocado');

const iconProbe = new FakeElement();
applyFoodSpriteStyle(iconProbe, 24, 54);
assert.equal(iconProbe.style.backgroundSize, '270px 270px');
assert.equal(iconProbe.style.backgroundPosition, '-216px -216px');

const game = new Game();
game.mount();
assert.equal(game.state, 'ready');
assert.equal(elements.get('stage-number').textContent, '1');
assert.equal(elements.get('score').textContent, '0');
assert.equal(elements.get('powerup-hud').hidden, true);
assert.equal(elements.get('btn-audio').textContent, '🔊');

// 960×540 uses width as the limiting cover dimension. The source ground line
// is 226 source pixels above the bottom: 226 * (960 / 1024) = 211.875 CSS px.
assert.ok(Math.abs(game.groundHeight - 211.875) < 0.001, 'ground should track background cover geometry');

// Source Minji faces left. Running right should therefore flip the sprite.
game.player.facing = 1;
game.player.setPosition();
assert.equal(elements.get('player').style.transform, 'scaleX(-1)');
game.player.facing = -1;
game.player.setPosition();
assert.equal(elements.get('player').style.transform, 'scaleX(1)');

game.start();
assert.equal(game.state, 'running');
assert.equal(game.audio.background.paused, false, 'background music should begin with the run');
assert.equal(game.audio.invincible.paused, true, 'invincibility music should wait for fruit');

// Gold v0.7 uses a two-thumb layout: movement on the left and jump on the
// right. Pointer events from separate fingers must be able to coexist.
fire(elements.get('btn-right'), 'pointerdown', { pointerId: 11, pointerType: 'touch' });
fire(elements.get('btn-jump'), 'pointerdown', { pointerId: 22, pointerType: 'touch' });
assert.equal(game.input.right, true, 'left-thumb movement should remain held');
assert.equal(game.input.jumpHeld, true, 'right-thumb jump should work at the same time');
assert.equal(elements.get('btn-right').classList.contains('is-held'), true);
assert.equal(elements.get('btn-jump').classList.contains('is-held'), true);
fire(elements.get('btn-right'), 'pointerup', { pointerId: 11, pointerType: 'touch' });
fire(elements.get('btn-jump'), 'pointerup', { pointerId: 22, pointerType: 'touch' });
assert.equal(game.input.right, false);
assert.equal(game.input.jumpHeld, false);

// Touching the world itself should no longer cause accidental jumps on mobile.
fire(elements.get('viewport'), 'pointerdown', {
  pointerId: 33,
  pointerType: 'touch',
  target: new FakeElement('touch-world'),
});
assert.equal(game.input.jumpHeld, false, 'touchscreen world taps should not jump');

// A real jump should expose a one-frame event, and the jump channel should be
// able to play without disturbing the background music.
game.input.jumpPressed = true;
game.input.jumpHeld = true;
game.player.update(0.016, game.input, game.viewportWidth);
assert.equal(game.player.jumpedThisFrame, true);
game.audio.playJump();
assert.equal(game.audio.jumpVoices.some((voice) => !voice.paused), true, 'jump sound should use an independent voice');
assert.equal(game.audio.background.paused, false, 'jump SFX should not interrupt background music');
game.input.consumeJumpPressed();
game.input.jumpHeld = false;

game._onEnemyActuallySpawned('jumper');
assert.equal(game.seenEnemyTypes.has('jumper'), true);
const effectsAfterFirstBanner = elements.get('effects').children.length;
game._onEnemyActuallySpawned('jumper');
assert.equal(elements.get('effects').children.length, effectsAfterFirstBanner);

const platform = new Platform({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  skin: 'cloud',
  topY: 420,
});
game.platforms.push(platform);
assert.equal(platform.w, 260);
assert.equal(platform.h, 85);
assert.equal(platform.bounds().left, platform.x + 20);
assert.equal(platform.bounds().right, platform.x + 240);

game._spawnCloudRider(platform);
const rider = game.enemies.at(-1);
assert.ok(rider._ride, 'cloud rider should begin attached');
const riderOffset = rider._ride.offsetX;
platform.update(0.016);
game._updateEnemies(0.016);
if (rider._ride) {
  assert.ok(Math.abs(rider.x - (platform.x + riderOffset)) < 0.001, 'rider should track platform x while attached');
  assert.ok(Math.abs(rider.y - (platform.worldTop() - game.groundHeight)) < 0.001, 'rider should track platform top');
}

// Food can use the same moving-platform coordinate system without becoming a
// separate fake platform. It should follow the platform while attached.
const attachedFood = new FoodPickup({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  itemIndex: 7,
  platform,
  size: 54,
});
game.foods.push(attachedFood);
const foodOffset = attachedFood.platformOffsetX;
platform.update(0.016);
attachedFood.update(0.016);
assert.ok(Math.abs(attachedFood.x - (platform.x + foodOffset)) < 0.001, 'food should track platform x');
assert.equal(attachedFood.item.name, 'Ice Cream Cone');
assert.equal(attachedFood.item.effect, FOOD_EFFECTS.SLOW);
assert.equal(attachedFood.el.dataset.foodEffect, 'slow');

// Random spawned food still chooses one of all 25 sheet cells.
const foodCountBeforeSpawn = game.foods.length;
game._spawnFood();
assert.equal(game.foods.length, foodCountBeforeSpawn + 1);
const spawnedFood = game.foods.at(-1);
assert.ok(spawnedFood.itemIndex >= 0 && spawnedFood.itemIndex < 25);

// FRUIT: collect a banana and verify the original six-second invulnerability,
// layered power-up music, status HUD, and collision suppression.
const fruit = new FoodPickup({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  itemIndex: 0,
  size: 54,
});
game.foods.push(fruit);
fruit.x = game.player.x;
fruit.y = game.player.y;
fruit.place();

game.elapsedMs = 5000;
game._handleFoodPickups();
assert.equal(game.foods.includes(fruit), false, 'collected fruit should leave the active pickup list');
assert.equal(game.player.invulnerable, true);
assert.equal(elements.get('player').classList.contains('invulnerable'), true);
assert.equal(elements.get('status-invulnerability').hidden, false);
assert.equal(game.invulnerableUntilMs, 11000);
assert.equal(game._isInvulnerable(), true);
assert.equal(game.audio.background.paused, false, 'background music should keep playing during invulnerability');
assert.equal(game.audio.invincible.paused, false, 'invincibility music should play on its own layer');
assert.equal(game.audio.background.volume, game.config.audio.backgroundMusic.volumeDuringInvincibility);

game._spawnStageEnemy();
const fruitCollisionEnemy = game.enemies.at(-1);
fruitCollisionEnemy.x = game.player.x;
fruitCollisionEnemy.y = game.player.y;
fruitCollisionEnemy.place();
assert.equal(game._handleEnemyCollisions(), false, 'fruit invulnerability should prevent game over');

// Pause/resume should suspend and restore both active music layers and freeze
// all elapsed-time-based food effects.
game.pause();
assert.equal(game.state, 'paused');
assert.equal(game.audio.background.paused, true);
assert.equal(game.audio.invincible.paused, true);
game.resume();
assert.equal(game.state, 'running');
assert.equal(game.audio.background.paused, false);
assert.equal(game.audio.invincible.paused, false);

game.elapsedMs = game.invulnerableUntilMs;
game._updatePowerupState();
assert.equal(game.player.invulnerable, false);
assert.equal(elements.get('status-invulnerability').hidden, true);
assert.equal(game.audio.invincible.paused, true, 'fruit music should stop when invulnerability ends');
assert.equal(game.audio.background.volume, game.config.audio.backgroundMusic.volume);

// Remove the old overlap enemy so shield tests are isolated.
fruitCollisionEnemy.remove();
game.enemies = game.enemies.filter((enemy) => enemy !== fruitCollisionEnemy);

// HEALTHY FOOD: one shield hit persists without a timer and can coexist with
// other effects. The protected collision removes the overlap threat and uses
// exactly one shield charge.
const healthy = new FoodPickup({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  itemIndex: 8,
  size: 54,
});
game.elapsedMs = 12000;
game._activateFoodPowerup(healthy);
assert.equal(game.shieldHits, 1);
assert.equal(game.player.shielded, true);
assert.equal(elements.get('status-shield').hidden, false);
assert.equal(elements.get('status-shield-time').textContent, '1 HIT');

game._spawnStageEnemy();
const shieldEnemy = game.enemies.at(-1);
shieldEnemy.x = game.player.x;
shieldEnemy.y = game.player.y;
shieldEnemy.place();
assert.equal(game._hasEnemyCollision(), false, 'a shielded collision is not immediately lethal');
assert.equal(game._handleEnemyCollisions(), false, 'shield should absorb the collision');
assert.equal(game.shieldHits, 0);
assert.equal(game.player.shielded, false);
assert.equal(game.enemies.includes(shieldEnemy), false, 'blocked overlap enemy should be removed');
assert.equal(elements.get('status-shield').hidden, true);

// COFFEE: increase only horizontal run movement, leave jump physics unchanged,
// and expose its own HUD timer.
const coffee = new FoodPickup({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  itemIndex: 12,
  size: 54,
});
game.elapsedMs = 13000;
game._activateFoodPowerup(coffee);
assert.equal(game._isSpeedBoosted(), true);
assert.equal(game._isSlowed(), false);
assert.equal(game.player.movementEffect, 'speed');
assert.equal(game.player.movementSpeedMultiplier, game.config.foodPowerup.effects.coffeeSpeedMultiplier);
assert.equal(elements.get('status-speed').hidden, false);
assert.equal(elements.get('player').classList.contains('speed-boosted'), true);

// JUNK FOOD: cancels coffee and replaces it with a real temporary slowdown.
const donut = new FoodPickup({
  container: elements.get('entities'),
  groundHeight: game.groundHeight,
  getViewportWidth: () => game.viewportWidth,
  itemIndex: 6,
  size: 54,
});
game.elapsedMs = 14000;
game._activateFoodPowerup(donut);
assert.equal(game._isSpeedBoosted(), false);
assert.equal(game._isSlowed(), true);
assert.equal(game.player.movementEffect, 'slow');
assert.equal(game.player.movementSpeedMultiplier, game.config.foodPowerup.effects.junkSpeedMultiplier);
assert.equal(elements.get('status-speed').hidden, true);
assert.equal(elements.get('status-slow').hidden, false);
assert.equal(elements.get('player').classList.contains('slowed'), true);

// Coffee can likewise cancel a currently active junk slowdown.
game.elapsedMs = 14500;
game._activateFoodPowerup(coffee);
assert.equal(game._isSlowed(), false);
assert.equal(game._isSpeedBoosted(), true);
assert.equal(game.player.movementEffect, 'speed');
assert.equal(elements.get('status-slow').hidden, true);
assert.equal(elements.get('status-speed').hidden, false);

// Let coffee expire and confirm movement returns to normal.
game.elapsedMs = game.speedBoostUntilMs;
game._updatePowerupState();
assert.equal(game._isSpeedBoosted(), false);
assert.equal(game.player.movementEffect, 'normal');
assert.equal(game.player.movementSpeedMultiplier, 1);
assert.equal(elements.get('status-speed').hidden, true);
assert.equal(elements.get('powerup-hud').hidden, true);

// With no fruit and no shield, an overlap becomes lethal again.
game._spawnStageEnemy();
const lethalEnemy = game.enemies.at(-1);
lethalEnemy.x = game.player.x;
lethalEnemy.y = game.player.y;
lethalEnemy.place();
assert.equal(game._hasEnemyCollision(), true);
assert.equal(game._handleEnemyCollisions(), true);

// The HUD sound toggle should mute all channels and persist locally.
game._toggleAudio();
assert.equal(game.audio.muted, true);
assert.equal(elements.get('btn-audio').textContent, '🔇');
assert.equal(fakeStorage.getItem(game.config.storageKeys.audioMuted), 'true');
assert.equal(game.audio.background.muted, true);
assert.equal(game.audio.invincible.muted, true);
assert.equal(game.audio.jumpVoices.every((voice) => voice.muted), true);
game._toggleAudio();
assert.equal(game.audio.muted, false);
assert.equal(elements.get('btn-audio').textContent, '🔊');

// Resize must move the ground line and every ground-relative actor together.
elements.get('viewport').clientWidth = 1079;
elements.get('viewport').clientHeight = 1780;
const oldGround = game.groundHeight;
game._onResize();
assert.notEqual(game.groundHeight, oldGround);
assert.equal(game.player.groundHeight, game.groundHeight);
assert.equal(platform.groundHeight, game.groundHeight);
assert.equal(rider.groundHeight, game.groundHeight);
assert.equal(attachedFood.groundHeight, game.groundHeight);

for (let index = 0; index < 55; index += 1) game._spawnStageEnemy();
assert.ok(game.totalSpawns >= 57, 'spawns should accumulate');
game._updateHud();
assert.equal(game.currentStage.number, 4);

game.gameOver();
assert.equal(game.state, 'gameover');
assert.equal(game.audio.background.paused, true, 'music should stop at game over');
assert.equal(game.audio.invincible.paused, true, 'power-up music should stop at game over');
assert.equal(game.player.movementEffect, 'normal');
assert.equal(game.shieldHits, 0);

console.log('Minji Runner Gold v0.7 smoke test passed.');
