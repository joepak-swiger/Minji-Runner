export const GAME_CONFIG = Object.freeze({
  background: Object.freeze({
    // The background is 1024×1536 and is rendered with object-fit: cover plus
    // object-position: center bottom. The yellow lip at source Y ~= 1310 is
    // the visual running surface. Game.js maps that source pixel to the live
    // viewport so the physics ground follows the artwork at every window size.
    sourceWidth: 1024,
    sourceHeight: 1536,
    groundSurfaceSourceY: 1310,
  }),
  player: Object.freeze({
    startX: 118,
    width: 58,
    height: 96,
    gravity: 1900,
    maxFallSpeed: 1650,
    maxRunSpeed: 430,
    acceleration: 2850,
    deceleration: 3700,
    jumpVelocity: 770,
    coyoteTime: 0.09,
    jumpBuffer: 0.11,
    jumpCutMultiplier: 0.45,
    hitboxInsetX: 10,
    hitboxInsetY: 7,
    walkFps: 9,

    // The source Minji artwork faces left. This lets movement direction drive
    // the flip correctly instead of assuming the source sprite faces right.
    spriteFacesRightByDefault: false,

    // The PNG has a few transparent pixels below the shoes. Pull the rendered
    // element down by this amount so the visible foot pixels touch the surface.
    renderFootOffsetPx: 3,
  }),
  spawning: Object.freeze({
    enemyGapMinMs: 920,
    enemyGapMaxMs: 1680,
    platformGapMinMs: 1450,
    platformGapMaxMs: 2300,
    cloudRiderChance: 0.30,
    cloudRiderTypes: Object.freeze(['walker', 'jumper']),
  }),
  foodPowerup: Object.freeze({
    enabled: true,
    iconSizePx: 54,
    baseSpeedPxPerSecond: 205,

    // Gold v0.5 gives each food family its own effect. The durations are
    // intentionally short enough to matter without overwhelming the runner.
    effects: Object.freeze({
      fruitInvulnerabilityMs: 6000,
      junkSlowMs: 5200,
      junkSpeedMultiplier: 0.62,
      coffeeBoostMs: 6000,
      coffeeSpeedMultiplier: 1.45,
      healthyShieldHits: 1,
    }),

    // The first pickup appears fairly early so a new player learns the system.
    firstSpawnMinMs: 8500,
    firstSpawnMaxMs: 13500,

    // Later pickups remain lucky (or unlucky) events instead of becoming
    // constant power-up spam.
    repeatSpawnMinMs: 18000,
    repeatSpawnMaxMs: 30000,

    // A pickup can ride a reachable platform when one is approaching. Otherwise
    // it enters as a free-floating collectible at a jumpable height.
    platformAttachChance: 0.42,
    groundLaneChance: 0.46,
    groundLaneY: 24,
    airLaneMinY: 78,
    airLaneMaxY: 162,
    platformLiftPx: 16,
    spawnOffsetX: 50,
  }),
  audio: Object.freeze({
    backgroundMusic: Object.freeze({
      src: 'assets/audio/background-chiptune.mp3',
      volume: 0.36,

      // Keep the regular song playing underneath the invincibility theme, but
      // duck it just enough that the temporary power-up music reads clearly.
      volumeDuringInvincibility: 0.18,
    }),
    invincibilityMusic: Object.freeze({
      src: 'assets/audio/invincible.mp3',
      volume: 0.68,
    }),
    jumpSound: Object.freeze({
      src: 'assets/audio/minji-jump.wav',
      volume: 0.60,

      // A tiny pool prevents a rapid second jump from having to wait for the
      // previous sound object to finish/reset.
      voices: 3,
    }),
  }),
  difficulty: Object.freeze({
    maxEnemyGapReduction: 0.24,
    enemyGapRampSeconds: 330,
    maxPlatformGapReduction: 0.12,
    platformGapRampSeconds: 420,
    maxSpeedMultiplier: 1.34,
    speedRampSeconds: 360,
  }),
  platform: Object.freeze({
    baseSpeedPxPerSecond: 218,
  }),
  storageKeys: Object.freeze({
    bestScore: 'minji-runner.best-score',
    bestTimeMs: 'minji-runner.best-time-ms',
    audioMuted: 'minji-runner.audio-muted',
  }),
});
