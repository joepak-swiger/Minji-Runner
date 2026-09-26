import { GAME_CONFIG } from '../config/gameConfig.js';
import {
  getFirstStageForEnemy,
  getNewEnemyTypesForStage,
  getStageForSpawnCount,
} from '../config/stages.js';
import Input from './Input.js';
import { readBoolean, readNumber, writeBoolean, writeNumber } from './storage.js';
import Minji from '../entities/Minji.js';
import { createEnemy, ENEMY_REGISTRY } from '../enemies/enemyRegistry.js';
import Platform from '../platforms/Platform.js';
import FoodPickup, { applyFoodSpriteStyle, FOOD_EFFECTS } from '../powerups/FoodPickup.js';
import AudioManager from './AudioManager.js';

export default class Game {
  constructor() {
    this.config = GAME_CONFIG;
    this.dom = this._collectDom();
    this.state = 'ready';
    this.rafId = 0;
    this.lastTimestamp = 0;
    this.startTimestamp = 0;
    this.pauseTimestamp = 0;
    this.elapsedMs = 0;

    this.viewportWidth = this.dom.viewport.clientWidth;
    this.viewportHeight = this.dom.viewport.clientHeight;
    this.groundHeight = this._calculateGroundHeight();
    this.dom.root.style.setProperty('--ground-height', `${this.groundHeight}px`);

    this.player = new Minji({
      el: this.dom.player,
      groundHeight: this.groundHeight,
      config: this.config.player,
    });

    this.input = new Input({
      getState: () => this.state,
      onStart: () => this.start(),
      onRestart: () => this.restart(),
      onPauseToggle: () => this.togglePause(),
      onResume: () => this.resume(),
    });

    this.audio = new AudioManager(this.config.audio);
    this.audio.setMuted(readBoolean(this.config.storageKeys.audioMuted, false));

    this.enemies = [];
    this.platforms = [];
    this.foods = [];
    this.totalSpawns = 0;
    this.score = 0;
    this.foodsCollected = 0;
    this.seenEnemyTypes = new Set();
    this.currentStage = getStageForSpawnCount(0);

    this.enemyClockMs = 0;
    this.platformClockMs = 0;
    this.foodClockMs = 0;
    this.nextEnemyDelayMs = 0;
    this.nextPlatformDelayMs = 0;
    this.nextFoodDelayMs = 0;

    this.invulnerableUntilMs = 0;
    this.speedBoostUntilMs = 0;
    this.slowUntilMs = 0;
    this.shieldHits = 0;

    this.activeInvulnerabilityFoodIndex = null;
    this.activeSpeedFoodIndex = null;
    this.activeSlowFoodIndex = null;
    this.activeShieldFoodIndex = null;

    this.bestScore = readNumber(this.config.storageKeys.bestScore, 0);
    this.bestTimeMs = readNumber(this.config.storageKeys.bestTimeMs, 0);

    this._resizeHandler = () => this._onResize();
    this._backgroundLoadHandler = () => this._onResize();
    this._visibilityHandler = () => {
      if (document.hidden && this.state === 'running') this.pause();
    };
  }

  mount() {
    this.input.attach({
      viewport: this.dom.viewport,
      leftButton: this.dom.leftButton,
      jumpButton: this.dom.jumpButton,
      rightButton: this.dom.rightButton,
    });

    this.dom.startButton.addEventListener('click', () => this.start());
    this.dom.pauseButton.addEventListener('click', () => this.togglePause());
    this.dom.resumeButton.addEventListener('click', () => this.resume());
    this.dom.restartButton.addEventListener('click', () => this.restart());
    this.dom.retryButton.addEventListener('click', () => this.restart());
    this.dom.audioButton.addEventListener('click', () => this._toggleAudio());

    window.addEventListener('resize', this._resizeHandler, { passive: true });
    this.dom.background.addEventListener('load', this._backgroundLoadHandler, { once: true });
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this._resetWorld();
    this._showOnlyPanel('start');
    this._updateAudioButton();
    this._updateHud();
  }

  start() {
    if (this.state === 'running') return;
    this._resetWorld();
    this.state = 'running';
    this._showOnlyPanel(null);
    this.dom.root.classList.remove('is-paused', 'game-over-hit');
    this.dom.pauseButton.textContent = 'Pause';
    this.audio.startRun();

    const now = performance.now();
    this.startTimestamp = now;
    this.lastTimestamp = now;
    this.pauseTimestamp = 0;
    this.rafId = requestAnimationFrame((timestamp) => this._tick(timestamp));
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.pauseTimestamp = performance.now();
    this.dom.root.classList.add('is-paused');
    this.dom.pauseButton.textContent = 'Resume';
    this._showOnlyPanel('pause');
    this.input.resetMovement();
    this.audio.pauseRun();
  }

  resume() {
    if (this.state !== 'paused') return;
    const now = performance.now();
    const pausedFor = Math.max(0, now - this.pauseTimestamp);
    this.startTimestamp += pausedFor;
    this.lastTimestamp = now;
    this.state = 'running';
    this.dom.root.classList.remove('is-paused');
    this.dom.pauseButton.textContent = 'Pause';
    this._showOnlyPanel(null);
    this.audio.resumeRun(this._isInvulnerable());
    this.rafId = requestAnimationFrame((timestamp) => this._tick(timestamp));
  }

  togglePause() {
    if (this.state === 'running') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  gameOver() {
    if (this.state !== 'running') return;
    this.state = 'gameover';
    this.input.resetMovement();
    this.player.flashHit();
    this._clearPowerup();
    this.dom.root.classList.remove('is-paused');
    this.dom.root.classList.add('game-over-hit');
    this.dom.pauseButton.textContent = 'Pause';
    this.audio.gameOver();

    this.bestScore = Math.max(this.bestScore, this.score);
    this.bestTimeMs = Math.max(this.bestTimeMs, this.elapsedMs);
    writeNumber(this.config.storageKeys.bestScore, this.bestScore);
    writeNumber(this.config.storageKeys.bestTimeMs, this.bestTimeMs);

    this.dom.finalTime.textContent = formatElapsed(this.elapsedMs);
    this.dom.finalScore.textContent = String(this.score);
    this.dom.finalStage.textContent = `${this.currentStage.number} · ${this.currentStage.name}`;
    this.dom.finalBest.textContent = String(this.bestScore);
    this._showOnlyPanel('gameover');
    this._updateHud();
  }

  _tick(timestamp) {
    if (this.state !== 'running') return;

    const dt = Math.min(0.033, Math.max(0.001, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    this.elapsedMs = timestamp - this.startTimestamp;

    const feetBefore = this._playerFeetWorldY();
    this.player.update(dt, this.input, this.viewportWidth);
    if (this.player.jumpedThisFrame) this.audio.playJump();

    this._updateSpawning(dt);
    this._updatePlatforms(dt);
    this._updateFoodPickups(dt);
    this._updateEnemies(dt);
    this._handlePlatformLanding(feetBefore);
    this._handleFoodPickups();
    this._updatePowerupState();

    if (this._handleEnemyCollisions()) {
      this.gameOver();
      return;
    }

    this._cleanupOffscreenObjects();
    this.currentStage = getStageForSpawnCount(this.totalSpawns);
    this._updateHud();
    this.input.consumeJumpPressed();

    this.rafId = requestAnimationFrame((nextTimestamp) => this._tick(nextTimestamp));
  }

  _resetWorld() {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.audio.stopAll({ resetBackground: true });

    for (const enemy of this.enemies) enemy.remove();
    for (const platform of this.platforms) platform.remove();
    for (const food of this.foods) food.remove();
    this.enemies.length = 0;
    this.platforms.length = 0;
    this.foods.length = 0;

    this.viewportWidth = this.dom.viewport.clientWidth;
    this.viewportHeight = this.dom.viewport.clientHeight;
    this._syncGroundToBackground();
    this.player.reset(this.viewportWidth);
    this.input.resetMovement();

    this.totalSpawns = 0;
    this.score = 0;
    this.foodsCollected = 0;
    this.elapsedMs = 0;
    this.seenEnemyTypes.clear();
    this.currentStage = getStageForSpawnCount(0);

    this.enemyClockMs = 0;
    this.platformClockMs = 0;
    this.foodClockMs = 0;
    this.nextEnemyDelayMs = this._nextEnemyDelay();
    this.nextPlatformDelayMs = this._nextPlatformDelay();
    this.nextFoodDelayMs = this._nextFoodDelay(true);

    this._clearPowerup();
    this.dom.effects.replaceChildren();
    this.dom.root.classList.remove('game-over-hit');
    this._updateHud();
  }

  _updateSpawning(dt) {
    this.enemyClockMs += dt * 1000;
    this.platformClockMs += dt * 1000;
    if (this.config.foodPowerup.enabled) this.foodClockMs += dt * 1000;

    if (this.enemyClockMs >= this.nextEnemyDelayMs) {
      this._spawnStageEnemy();
      this.enemyClockMs = 0;
      this.nextEnemyDelayMs = this._nextEnemyDelay();
    }

    if (this.platformClockMs >= this.nextPlatformDelayMs) {
      this._spawnPlatform();
      this.platformClockMs = 0;
      this.nextPlatformDelayMs = this._nextPlatformDelay();
    }

    if (this.config.foodPowerup.enabled && this.foodClockMs >= this.nextFoodDelayMs) {
      this._spawnFood();
      this.foodClockMs = 0;
      this.nextFoodDelayMs = this._nextFoodDelay(false);
    }
  }

  _spawnStageEnemy() {
    const stage = getStageForSpawnCount(this.totalSpawns);
    const type = pickWeighted(stage.weights);
    const enemy = createEnemy(type, this._enemyContext(), this._speedMultiplier());
    this.enemies.push(enemy);
    this.totalSpawns += 1;
    this._onEnemyActuallySpawned(type);
  }

  _spawnPlatform() {
    const skin = pickWeighted({ brick: 3, tuft: 3, leaf: 2, cloud: 1 });
    const jumpRise = (this.config.player.jumpVelocity ** 2) / (2 * this.config.player.gravity);
    const maxStepUp = Math.floor(jumpRise * 0.83);

    const platform = new Platform({
      container: this.dom.entities,
      groundHeight: this.groundHeight,
      getViewportWidth: () => this.viewportWidth,
      skin,
      speedPx: this.config.platform.baseSpeedPxPerSecond,
      speedMultiplier: 1 + (this._speedMultiplier() - 1) * 0.45,
      maxStepUpPx: maxStepUp,
      currentSurfaceTopY: this._playerFeetWorldY(),
    });
    this.platforms.push(platform);

    if (skin === 'cloud' && Math.random() < this.config.spawning.cloudRiderChance) {
      this._spawnCloudRider(platform);
    }
  }

  _spawnCloudRider(platform) {
    const stage = getStageForSpawnCount(this.totalSpawns);
    const allowed = this.config.spawning.cloudRiderTypes.filter((type) => Object.hasOwn(stage.weights, type));
    if (!allowed.length) return;

    const riderWeights = Object.fromEntries(allowed.map((type) => [type, stage.weights[type]]));
    const type = pickWeighted(riderWeights);
    const enemy = createEnemy(type, this._enemyContext(), this._speedMultiplier());
    enemy.y = platform.worldTop() - this.groundHeight;
    enemy.x = platform.centerX() - enemy.w * 0.5;
    enemy._ride = {
      platform,
      offsetX: enemy.x - platform.x,
    };
    if ('vy' in enemy) enemy.vy = 0;
    if ('onGround' in enemy) enemy.onGround = true;
    enemy.place();

    this.enemies.push(enemy);
    this.totalSpawns += 1;
    this._onEnemyActuallySpawned(type);
  }

  _spawnFood() {
    const cfg = this.config.foodPowerup;
    const candidatePlatform = this._findFoodPlatform();
    const usePlatform = Boolean(candidatePlatform) && Math.random() < cfg.platformAttachChance;

    let y = cfg.groundLaneY;
    if (!usePlatform && Math.random() >= cfg.groundLaneChance) {
      y = randomFloat(cfg.airLaneMinY, cfg.airLaneMaxY);
    }

    const food = new FoodPickup({
      container: this.dom.entities,
      groundHeight: this.groundHeight,
      getViewportWidth: () => this.viewportWidth,
      size: cfg.iconSizePx,
      speedPx: cfg.baseSpeedPxPerSecond,
      speedMultiplier: 1 + (this._speedMultiplier() - 1) * 0.35,
      spawnOffsetX: cfg.spawnOffsetX,
      y,
      platform: usePlatform ? candidatePlatform : null,
      platformLiftPx: cfg.platformLiftPx,
    });

    this.foods.push(food);
  }

  _findFoodPlatform() {
    const riderPlatforms = new Set(
      this.enemies
        .map((enemy) => enemy._ride?.platform)
        .filter(Boolean),
    );

    const candidates = this.platforms.filter((platform) => (
      !platform._removed
      && !riderPlatforms.has(platform)
      && platform.x + platform.w >= this.viewportWidth * 0.58
      && platform.x <= this.viewportWidth + 130
    ));

    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _onEnemyActuallySpawned(type) {
    if (this.seenEnemyTypes.has(type)) return;
    this.seenEnemyTypes.add(type);

    const firstStage = getFirstStageForEnemy(type);
    const newTypes = getNewEnemyTypesForStage(firstStage.number);
    if (!newTypes.includes(type)) return;

    const entry = ENEMY_REGISTRY[type];
    this._showEnemyBanner(firstStage.number, firstStage.name, entry?.label ?? type);
  }

  _showEnemyBanner(stageNumber, stageName, enemyLabel) {
    const banner = document.createElement('div');
    banner.className = 'stage-banner';
    banner.innerHTML = `
      <span class="stage-banner-kicker">STAGE ${stageNumber} · ${escapeHtml(stageName)}</span>
      <strong>New enemy: ${escapeHtml(enemyLabel)}</strong>
      <small>It joins the spawn pool now that it has actually appeared.</small>
    `;
    this.dom.effects.appendChild(banner);
    window.setTimeout(() => banner.remove(), 2800);
  }

  _showPowerupToast(food) {
    const effectConfig = this.config.foodPowerup.effects;
    const toast = document.createElement('div');
    toast.className = 'powerup-toast';
    toast.dataset.foodEffect = food.item.effect;

    const icon = document.createElement('span');
    icon.className = 'powerup-toast-icon';
    applyFoodSpriteStyle(icon, food.itemIndex, 40);

    const copy = document.createElement('span');
    copy.className = 'powerup-toast-copy';

    const title = document.createElement('strong');
    const detail = document.createElement('small');

    switch (food.item.effect) {
      case FOOD_EFFECTS.INVULNERABILITY:
        title.textContent = 'INVINCIBLE!';
        detail.textContent = `${food.item.name} fruit · ${(effectConfig.fruitInvulnerabilityMs / 1000).toFixed(0)} seconds`;
        break;
      case FOOD_EFFECTS.SHIELD:
        title.textContent = 'SHIELD UP!';
        detail.textContent = `${food.item.name} · blocks the next enemy hit`;
        break;
      case FOOD_EFFECTS.SPEED:
        title.textContent = 'CAFFEINATED!';
        detail.textContent = `${food.item.name} · ${Math.round((effectConfig.coffeeSpeedMultiplier - 1) * 100)}% faster for ${(effectConfig.coffeeBoostMs / 1000).toFixed(0)} seconds`;
        break;
      case FOOD_EFFECTS.SLOW:
        title.textContent = 'UH OH... SLUGGISH!';
        detail.textContent = `${food.item.name} · ${Math.round((1 - effectConfig.junkSpeedMultiplier) * 100)}% slower for ${(effectConfig.junkSlowMs / 1000).toFixed(1)} seconds`;
        break;
      default:
        title.textContent = 'SNACK!';
        detail.textContent = food.item.name;
        break;
    }

    copy.appendChild(title);
    copy.appendChild(detail);
    toast.appendChild(icon);
    toast.appendChild(copy);
    this.dom.effects.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  _showShieldPopToast() {
    const toast = document.createElement('div');
    toast.className = 'shield-pop-toast';
    toast.innerHTML = `
      <strong>SHIELD POP!</strong>
      <small>The hit was blocked.</small>
    `;
    this.dom.effects.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1200);
  }

  _updatePlatforms(dt) {
    for (const platform of this.platforms) platform.update(dt);
  }

  _updateFoodPickups(dt) {
    for (const food of this.foods) food.update(dt);
  }

  _updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.x);

      if (enemy._ride?.platform) {
        const platform = enemy._ride.platform;
        const stillOverPlatform = !platform._removed && horizontallyOver(enemy, platform);
        const tryingToJump = typeof enemy.vy === 'number' && enemy.vy > 0;

        if (!stillOverPlatform || tryingToJump) {
          enemy._ride = null;
        } else {
          enemy.x = platform.x + enemy._ride.offsetX;
          enemy.y = platform.worldTop() - this.groundHeight;
          if ('vy' in enemy) enemy.vy = 0;
          if ('onGround' in enemy) enemy.onGround = true;
          enemy.place();
        }
      } else if (!enemy.isFlying && enemy.y > 0 && !('vy' in enemy)) {
        enemy.y = Math.max(0, enemy.y - 900 * dt);
        enemy.place();
      }

      if (!enemy.scored && enemy.hasPassedX(this.player.x)) {
        enemy.scored = true;
        this.score += 1;
      }
    }
  }

  _handlePlatformLanding(feetBefore) {
    if (this.player.vy > 0) return;

    const feetNow = this._playerFeetWorldY();
    const playerBounds = this.player.bounds();

    for (const platform of this.platforms) {
      const bounds = platform.bounds();
      const wasAbove = feetBefore >= bounds.top - 1;
      const crossedSurface = feetNow <= bounds.top;
      const horizontalOverlap = playerBounds.right > bounds.left && playerBounds.left < bounds.right;

      if (wasAbove && crossedSurface && horizontalOverlap) {
        this.player.landOn(bounds.top);
        return;
      }
    }
  }

  _handleFoodPickups() {
    if (!this.foods.length) return;

    const playerBounds = this.player.bounds();
    let collectedAny = false;

    for (const food of this.foods) {
      if (food.collected || food._removed) continue;
      if (!aabbOverlap(playerBounds, food.bounds())) continue;

      food.collected = true;
      this._activateFoodPowerup(food);
      food.remove();
      collectedAny = true;
    }

    if (collectedAny) {
      this.foods = this.foods.filter((food) => !food.collected && !food._removed);
    }
  }

  _activateFoodPowerup(food) {
    const cfg = this.config.foodPowerup.effects;
    this.foodsCollected += 1;

    switch (food.item.effect) {
      case FOOD_EFFECTS.INVULNERABILITY:
        this.activeInvulnerabilityFoodIndex = food.itemIndex;
        this.invulnerableUntilMs = this.elapsedMs + cfg.fruitInvulnerabilityMs;
        this.player.setInvulnerable(true);
        this.audio.activateInvincibility();
        break;

      case FOOD_EFFECTS.SHIELD:
        this.activeShieldFoodIndex = food.itemIndex;
        this.shieldHits = cfg.healthyShieldHits;
        this.player.setShielded(this.shieldHits > 0);
        break;

      case FOOD_EFFECTS.SPEED:
        // Coffee and junk food are deliberately mutually exclusive. Grabbing
        // coffee immediately shakes off a slowdown rather than multiplying two
        // opposing modifiers into an unclear result.
        this.slowUntilMs = 0;
        this.activeSlowFoodIndex = null;
        this.activeSpeedFoodIndex = food.itemIndex;
        this.speedBoostUntilMs = this.elapsedMs + cfg.coffeeBoostMs;
        break;

      case FOOD_EFFECTS.SLOW:
        // Likewise, junk food/beer cancels a coffee boost and replaces it with
        // a temporary sluggish movement state.
        this.speedBoostUntilMs = 0;
        this.activeSpeedFoodIndex = null;
        this.activeSlowFoodIndex = food.itemIndex;
        this.slowUntilMs = this.elapsedMs + cfg.junkSlowMs;
        break;

      default:
        break;
    }

    this._updatePowerupState();
    this._showPowerupToast(food);
  }

  _updatePowerupState() {
    const cfg = this.config.foodPowerup.effects;

    const invulnerable = this._isInvulnerable();
    if (invulnerable) {
      this.player.setInvulnerable(true);
    } else if (this.player.invulnerable || this.activeInvulnerabilityFoodIndex !== null) {
      this.invulnerableUntilMs = 0;
      this.activeInvulnerabilityFoodIndex = null;
      this.player.setInvulnerable(false);
      this.audio.deactivateInvincibility();
    }

    if (!this._isSpeedBoosted() && this.activeSpeedFoodIndex !== null) {
      this.speedBoostUntilMs = 0;
      this.activeSpeedFoodIndex = null;
    }

    if (!this._isSlowed() && this.activeSlowFoodIndex !== null) {
      this.slowUntilMs = 0;
      this.activeSlowFoodIndex = null;
    }

    if (this._isSpeedBoosted()) {
      this.player.setMovementEffect('speed', cfg.coffeeSpeedMultiplier);
    } else if (this._isSlowed()) {
      this.player.setMovementEffect('slow', cfg.junkSpeedMultiplier);
    } else {
      this.player.setMovementEffect('normal', 1);
    }

    this.player.setShielded(this.shieldHits > 0);
    this._updatePowerupHud();
  }

  _updatePowerupHud() {
    const showStatus = (status, {
      visible,
      itemIndex,
      label,
      value,
    }) => {
      status.root.hidden = !visible;
      if (!visible) return;

      if (Number.isInteger(itemIndex)) {
        applyFoodSpriteStyle(status.icon, itemIndex, 30);
      }
      status.name.textContent = label;
      status.time.textContent = value;
    };

    showStatus(this.dom.invulnerabilityStatus, {
      visible: this._isInvulnerable(),
      itemIndex: this.activeInvulnerabilityFoodIndex,
      label: 'Invincible',
      value: `${(Math.max(0, this.invulnerableUntilMs - this.elapsedMs) / 1000).toFixed(1)}s`,
    });

    showStatus(this.dom.speedStatus, {
      visible: this._isSpeedBoosted(),
      itemIndex: this.activeSpeedFoodIndex,
      label: 'Coffee Rush',
      value: `${(Math.max(0, this.speedBoostUntilMs - this.elapsedMs) / 1000).toFixed(1)}s`,
    });

    showStatus(this.dom.slowStatus, {
      visible: this._isSlowed(),
      itemIndex: this.activeSlowFoodIndex,
      label: 'Sluggish',
      value: `${(Math.max(0, this.slowUntilMs - this.elapsedMs) / 1000).toFixed(1)}s`,
    });

    showStatus(this.dom.shieldStatus, {
      visible: this.shieldHits > 0,
      itemIndex: this.activeShieldFoodIndex,
      label: 'Shield',
      value: `${this.shieldHits} HIT`,
    });

    this.dom.powerupHud.hidden = !(
      this._isInvulnerable()
      || this._isSpeedBoosted()
      || this._isSlowed()
      || this.shieldHits > 0
    );
  }

  _clearPowerup() {
    this.invulnerableUntilMs = 0;
    this.speedBoostUntilMs = 0;
    this.slowUntilMs = 0;
    this.shieldHits = 0;

    this.activeInvulnerabilityFoodIndex = null;
    this.activeSpeedFoodIndex = null;
    this.activeSlowFoodIndex = null;
    this.activeShieldFoodIndex = null;

    this.player.setInvulnerable(false);
    this.player.setShielded(false);
    this.player.setMovementEffect('normal', 1);
    this.audio.deactivateInvincibility();

    this.dom.powerupHud.hidden = true;
    this.dom.invulnerabilityStatus.root.hidden = true;
    this.dom.speedStatus.root.hidden = true;
    this.dom.slowStatus.root.hidden = true;
    this.dom.shieldStatus.root.hidden = true;
  }

  _isInvulnerable() {
    return this.invulnerableUntilMs > this.elapsedMs;
  }

  _isSpeedBoosted() {
    return this.speedBoostUntilMs > this.elapsedMs;
  }

  _isSlowed() {
    return this.slowUntilMs > this.elapsedMs;
  }

  _hasEnemyCollision() {
    if (this._isInvulnerable() || this.shieldHits > 0) return false;
    const playerBounds = this.player.bounds();
    return this.enemies.some((enemy) => aabbOverlap(playerBounds, enemy.bounds()));
  }

  _handleEnemyCollisions() {
    if (this._isInvulnerable()) return false;

    const playerBounds = this.player.bounds();
    const colliding = this.enemies.filter((enemy) => aabbOverlap(playerBounds, enemy.bounds()));
    if (!colliding.length) return false;

    if (this.shieldHits > 0) {
      this.shieldHits = Math.max(0, this.shieldHits - 1);
      if (this.shieldHits === 0) this.activeShieldFoodIndex = null;

      // Treat enemies overlapping on this exact frame as one collision event.
      // Removing the whole overlap cluster prevents a single protected contact
      // from immediately killing Minji one frame later while sprites intersect.
      const blockedEnemies = new Set(colliding);
      for (const enemy of colliding) enemy.remove();
      this.enemies = this.enemies.filter((enemy) => !blockedEnemies.has(enemy));

      this.player.setShielded(this.shieldHits > 0);
      this.player.flashShieldHit();
      this._showShieldPopToast();
      this._updatePowerupState();
      return false;
    }

    return true;
  }

  _cleanupOffscreenObjects() {
    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.isOffscreenLeft()) return true;
      enemy.remove();
      return false;
    });

    this.foods = this.foods.filter((food) => {
      if (!food.isOffscreenLeft() && !food._removed) return true;
      food.remove();
      return false;
    });

    for (let index = this.platforms.length - 1; index >= 0; index -= 1) {
      const platform = this.platforms[index];
      if (!platform.isOffscreenLeft()) continue;

      for (const enemy of this.enemies) {
        if (enemy._ride?.platform === platform) enemy._ride = null;
      }
      for (const food of this.foods) {
        if (food.platform === platform) food.platform = null;
      }
      platform.remove();
      this.platforms.splice(index, 1);
    }
  }

  _enemyContext() {
    return {
      container: this.dom.entities,
      groundHeight: this.groundHeight,
      getViewportWidth: () => this.viewportWidth,
      getViewportHeight: () => this.viewportHeight,
    };
  }

  _nextEnemyDelay() {
    const elapsedSeconds = this.elapsedMs / 1000;
    const progress = clamp(elapsedSeconds / this.config.difficulty.enemyGapRampSeconds, 0, 1);
    const factor = 1 - this.config.difficulty.maxEnemyGapReduction * progress;
    const min = Math.round(this.config.spawning.enemyGapMinMs * factor);
    const max = Math.round(this.config.spawning.enemyGapMaxMs * factor);
    return randomInt(min, max);
  }

  _nextPlatformDelay() {
    const elapsedSeconds = this.elapsedMs / 1000;
    const progress = clamp(elapsedSeconds / this.config.difficulty.platformGapRampSeconds, 0, 1);
    const factor = 1 - this.config.difficulty.maxPlatformGapReduction * progress;
    const min = Math.round(this.config.spawning.platformGapMinMs * factor);
    const max = Math.round(this.config.spawning.platformGapMaxMs * factor);
    return randomInt(min, max);
  }

  _nextFoodDelay(firstSpawn) {
    const cfg = this.config.foodPowerup;
    if (firstSpawn) return randomInt(cfg.firstSpawnMinMs, cfg.firstSpawnMaxMs);
    return randomInt(cfg.repeatSpawnMinMs, cfg.repeatSpawnMaxMs);
  }

  _speedMultiplier() {
    const elapsedSeconds = this.elapsedMs / 1000;
    const progress = clamp(elapsedSeconds / this.config.difficulty.speedRampSeconds, 0, 1);
    return 1 + (this.config.difficulty.maxSpeedMultiplier - 1) * progress;
  }

  _playerFeetWorldY() {
    return this.groundHeight + this.player.y;
  }

  _calculateGroundHeight() {
    const bg = this.config.background;
    const scale = Math.max(
      this.viewportWidth / bg.sourceWidth,
      this.viewportHeight / bg.sourceHeight,
    );

    // With object-position: center bottom, the bottom of the source image and
    // viewport always coincide. Therefore the distance from the source's
    // ground pixel to its bottom, multiplied by the cover scale, is the live
    // CSS-pixel ground height.
    const sourceDistanceFromBottom = bg.sourceHeight - bg.groundSurfaceSourceY;
    return sourceDistanceFromBottom * scale;
  }

  _syncGroundToBackground() {
    const nextGroundHeight = this._calculateGroundHeight();
    if (!Number.isFinite(nextGroundHeight) || nextGroundHeight <= 0) return;

    this.groundHeight = nextGroundHeight;
    this.dom.root.style.setProperty('--ground-height', `${this.groundHeight}px`);

    if (this.player) this.player.setGroundHeight(this.groundHeight);
    for (const enemy of this.enemies) enemy.setGroundHeight?.(this.groundHeight);
    for (const platform of this.platforms) platform.setGroundHeight?.(this.groundHeight);
    for (const food of this.foods) food.setGroundHeight?.(this.groundHeight);
  }

  _updateHud() {
    const stage = getStageForSpawnCount(this.totalSpawns);
    this.currentStage = stage;
    this.dom.timer.textContent = formatElapsed(this.elapsedMs);
    this.dom.score.textContent = String(this.score);
    this.dom.bestScore.textContent = String(this.bestScore);
    this.dom.stageNumber.textContent = String(stage.number);
    this.dom.stageName.textContent = stage.name;
    this._updatePowerupState();
  }


  _toggleAudio() {
    const muted = this.audio.toggleMuted();
    writeBoolean(this.config.storageKeys.audioMuted, muted);
    this._updateAudioButton();
  }

  _updateAudioButton() {
    const muted = this.audio.muted;
    this.dom.audioButton.textContent = muted ? '🔇' : '🔊';
    this.dom.audioButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.dom.audioButton.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
    this.dom.audioButton.setAttribute('title', muted ? 'Turn sound on' : 'Mute sound');
  }

  _showOnlyPanel(which) {
    this.dom.startPanel.classList.toggle('visible', which === 'start');
    this.dom.pausePanel.classList.toggle('visible', which === 'pause');
    this.dom.gameoverPanel.classList.toggle('visible', which === 'gameover');
    this.dom.overlay.classList.toggle('inactive', which == null);
  }

  _onResize() {
    this.viewportWidth = this.dom.viewport.clientWidth;
    this.viewportHeight = this.dom.viewport.clientHeight;
    this._syncGroundToBackground();

    const maxX = Math.max(0, this.viewportWidth - this.player.w);
    this.player.x = clamp(this.player.x, 0, maxX);
    this.player.setPosition();

    for (const enemy of this.enemies) enemy.place();
    for (const platform of this.platforms) platform.place();
    for (const food of this.foods) food.place();
  }

  _collectDom() {
    const required = (id) => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`Minji Runner: missing required #${id} element.`);
      return element;
    };

    return {
      root: required('game-root'),
      viewport: required('viewport'),
      background: required('background'),
      entities: required('entities'),
      effects: required('effects'),
      player: required('player'),
      overlay: required('overlay'),
      timer: required('timer-value'),
      score: required('score'),
      bestScore: required('best-score'),
      stageNumber: required('stage-number'),
      stageName: required('stage-name'),
      powerupHud: required('powerup-hud'),
      invulnerabilityStatus: collectStatus(required, 'invulnerability'),
      speedStatus: collectStatus(required, 'speed'),
      shieldStatus: collectStatus(required, 'shield'),
      slowStatus: collectStatus(required, 'slow'),
      startPanel: required('start-screen'),
      pausePanel: required('pause-screen'),
      gameoverPanel: required('gameover-screen'),
      startButton: required('btn-start'),
      pauseButton: required('btn-pause'),
      audioButton: required('btn-audio'),
      resumeButton: required('btn-resume'),
      restartButton: required('btn-restart'),
      retryButton: required('btn-retry'),
      leftButton: required('btn-left'),
      jumpButton: required('btn-jump'),
      rightButton: required('btn-right'),
      finalTime: required('final-time'),
      finalScore: required('final-score'),
      finalStage: required('final-stage'),
      finalBest: required('final-best'),
    };
  }
}


function collectStatus(required, key) {
  return {
    root: required(`status-${key}`),
    icon: required(`status-${key}-icon`),
    name: required(`status-${key}-name`),
    time: required(`status-${key}-time`),
  };
}

function aabbOverlap(a, b) {
  return !(
    a.right <= b.left
    || a.left >= b.right
    || a.top <= b.bottom
    || a.bottom >= b.top
  );
}

function horizontallyOver(enemy, platform) {
  const enemyBounds = enemy.bounds();
  const platformBounds = platform.bounds();
  return enemyBounds.left < platformBounds.right && enemyBounds.right > platformBounds.left;
}

function pickWeighted(weightMap) {
  const entries = Object.entries(weightMap).filter(([, weight]) => weight > 0);
  if (!entries.length) throw new Error('pickWeighted requires at least one positive weight.');

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatElapsed(ms) {
  const safeMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
